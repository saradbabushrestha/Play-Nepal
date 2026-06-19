import type { Server } from 'socket.io';
import {
  getEngine,
  type GameEngine,
  type GameResult,
  type MatchReward,
  type MatchSnapshot,
  type PlayerSlot,
} from '@play-nepal/shared';
import { prisma } from '../prisma.js';
import { logger } from '../logger.js';
import { recordMatchResult } from '../services/rating.service.js';
import type { RoomWithMembers } from '../services/room.service.js';

interface LivePlayer extends PlayerSlot {}

interface LiveMatch {
  id: string;
  roomId: string;
  gameId: string;
  engine: GameEngine<unknown, unknown>;
  state: unknown;
  version: number;
  ranked: boolean;
  players: LivePlayer[];
  finished: boolean;
  aiTimer?: NodeJS.Timeout;
}

const AI_THINK_MS = 650;

/**
 * Owns every in-flight match. The engine is the single source of truth;
 * this class is the authoritative server-side runner — it validates moves,
 * drives AI seats, persists state for replay/resume, and broadcasts updates.
 *
 * In-memory today; the scaling doc covers moving hot state to Redis so any
 * node can own any match.
 */
export class MatchRuntime {
  private matches = new Map<string, LiveMatch>();
  /** roomId -> matchId, so a room only runs one match at a time. */
  private roomIndex = new Map<string, string>();

  /** Optional hook fired when a match finishes (used to push friend activity). */
  onFinish?: (roomId: string, gameId: string, userIds: string[], result: GameResult) => void;

  constructor(private io: Server) {}

  getByRoom(roomId: string): LiveMatch | undefined {
    const id = this.roomIndex.get(roomId);
    return id ? this.matches.get(id) : undefined;
  }

  get(matchId: string): LiveMatch | undefined {
    return this.matches.get(matchId);
  }

  /** Build seats from a room, filling empty seats with AI when supported. */
  private buildSeats(room: RoomWithMembers, engine: GameEngine): LivePlayer[] {
    const humans = room.members
      .filter((m) => m.role !== 'SPECTATOR')
      .sort((a, b) => (a.seat ?? 0) - (b.seat ?? 0));

    const aiDifficulty =
      (room.settings as { aiDifficulty?: 'easy' | 'medium' | 'hard' })?.aiDifficulty ?? 'medium';

    const seats: LivePlayer[] = humans.map((m, i) => ({
      seat: m.seat ?? i,
      playerId: m.userId,
      userId: m.userId,
      displayName: m.user.displayName,
      isAI: false,
    }));

    if (engine.meta.supportsAI) {
      let seat = seats.length;
      while (seats.length < engine.meta.minPlayers) {
        seats.push({
          seat,
          playerId: `ai-${seat}`,
          userId: null,
          displayName: `AI (${aiDifficulty})`,
          isAI: true,
          aiDifficulty,
        });
        seat++;
      }
    }
    return seats.sort((a, b) => a.seat - b.seat);
  }

  async startMatch(room: RoomWithMembers): Promise<LiveMatch> {
    const existing = this.getByRoom(room.id);
    if (existing && !existing.finished) return existing;

    const engine = getEngine(room.gameId);
    if (!engine) throw new Error(`Game "${room.gameId}" is not playable yet.`);

    const players = this.buildSeats(room, engine);
    if (players.length < engine.meta.minPlayers) {
      throw new Error(`Need at least ${engine.meta.minPlayers} players to start.`);
    }

    // A per-match random seed makes dice/shuffle games unpredictable while
    // keeping the engine pure (the seed is then advanced deterministically).
    const seed = (Math.floor(Math.random() * 0xffffffff) >>> 0) || 1;
    const state = engine.createInitialState(players, { seed });

    const record = await prisma.match.create({
      data: {
        roomId: room.id,
        gameId: room.gameId,
        ranked: engine.meta.ranked,
        state: state as object,
        moves: [],
        players: {
          create: players.map((p) => ({
            userId: p.userId,
            seat: p.seat,
            playerId: p.playerId,
            isAI: p.isAI,
            aiLevel: p.aiDifficulty,
          })),
        },
      },
    });

    await prisma.room.update({ where: { id: room.id }, data: { status: 'IN_GAME' } });
    await prisma.game.update({ where: { id: room.gameId }, data: { playCount: { increment: 1 } } }).catch(() => {});

    const match: LiveMatch = {
      id: record.id,
      roomId: room.id,
      gameId: room.gameId,
      engine,
      state,
      version: 0,
      ranked: engine.meta.ranked,
      players,
      finished: false,
    };
    this.matches.set(match.id, match);
    this.roomIndex.set(room.id, match.id);

    await this.broadcast(match, 'game:started');
    this.maybeRunAI(match);
    return match;
  }

  /** The engine playerId a given socket user should see the game as (null = spectator). */
  private viewerIdFor(match: LiveMatch, userId: string): string | null {
    return match.players.some((p) => p.userId === userId) ? userId : null;
  }

  /** Emit a snapshot to every socket in the room, each through the engine's
   *  `viewFor` so hidden-information games (Mafia, Heads Up) stay secret. */
  private async broadcast(match: LiveMatch, event: 'game:started' | 'game:update'): Promise<void> {
    const sockets = await this.io.in(`room:${match.roomId}`).fetchSockets();
    for (const s of sockets) {
      s.emit(event, this.snapshot(match, this.viewerIdFor(match, (s.data as { userId: string }).userId)));
    }
  }

  /** Apply a human move. Returns the new snapshot or throws on illegal move. */
  async applyMove(matchId: string, userId: string, move: unknown): Promise<MatchSnapshot> {
    const match = this.matches.get(matchId);
    if (!match) throw new Error('Match not found.');
    if (match.finished) throw new Error('Match is already over.');

    const player = match.players.find((p) => p.userId === userId && !p.isAI);
    if (!player) throw new Error('You are not a player in this match.');

    // Anti-cheat: server re-validates turn + legality through the engine.
    // A null currentTurn means simultaneous play (e.g. quizzes) — the engine
    // itself decides who may move, so only block when a specific turn is set.
    const turn = match.engine.currentTurn(match.state);
    if (turn !== null && turn !== player.playerId) {
      throw new Error('It is not your turn.');
    }
    const result = match.engine.applyMove(match.state, move, player.playerId);
    if (!result.ok) throw new Error(result.error);

    await this.commit(match, result.state, move);
    this.maybeRunAI(match);
    return this.snapshot(match, player.playerId);
  }

  async resign(matchId: string, userId: string): Promise<void> {
    const match = this.matches.get(matchId);
    if (!match || match.finished) return;
    const player = match.players.find((p) => p.userId === userId && !p.isAI);
    if (!player) return;
    const opponents = match.players.filter((p) => p.playerId !== player.playerId);
    const winner = opponents[0]?.playerId ?? null;
    await this.finish(match, { winnerId: winner, draw: false, reason: 'Opponent resigned' });
  }

  /** Persist new state + move, bump version, broadcast, settle if terminal. */
  private async commit(match: LiveMatch, nextState: unknown, move: unknown): Promise<void> {
    match.state = nextState;
    match.version += 1;

    // Persist asynchronously; correctness of the live game doesn't block on it.
    prisma.match
      .update({
        where: { id: match.id },
        data: {
          state: nextState as object,
          version: match.version,
          moves: { push: move as object } as never,
        },
      })
      .catch((err) => logger.error({ err, matchId: match.id }, 'Failed to persist move'));

    const result = match.engine.getResult(match.state);
    if (result) {
      await this.finish(match, result);
    } else {
      await this.broadcast(match, 'game:update');
    }
  }

  /** Drive AI seats when it's their turn (supports AI-vs-AI loops). */
  private maybeRunAI(match: LiveMatch): void {
    if (match.finished || !match.engine.aiMove) return;
    const turn = match.engine.currentTurn(match.state);
    if (!turn) return;
    const seat = match.players.find((p) => p.playerId === turn);
    if (!seat?.isAI) return;

    if (match.aiTimer) clearTimeout(match.aiTimer);
    match.aiTimer = setTimeout(() => {
      void this.runAITurn(match, seat.playerId);
    }, AI_THINK_MS);
  }

  private async runAITurn(match: LiveMatch, playerId: string): Promise<void> {
    if (match.finished) return;
    const seat = match.players.find((p) => p.playerId === playerId);
    if (!seat?.isAI || match.engine.currentTurn(match.state) !== playerId) return;

    const move = match.engine.aiMove!(match.state, playerId, seat.aiDifficulty ?? 'medium');
    if (!move) return;
    const result = match.engine.applyMove(match.state, move, playerId);
    if (!result.ok) {
      logger.warn({ matchId: match.id, error: result.error }, 'AI produced an illegal move');
      return;
    }
    await this.commit(match, result.state, move);
    this.maybeRunAI(match);
  }

  private async finish(match: LiveMatch, result: GameResult): Promise<void> {
    match.finished = true;
    if (match.aiTimer) clearTimeout(match.aiTimer);

    const winnerSeat = result.winnerId
      ? match.players.find((p) => p.playerId === result.winnerId)
      : undefined;

    await prisma.match.update({
      where: { id: match.id },
      data: {
        status: 'FINISHED',
        finishedAt: new Date(),
        winnerId: result.winnerId,
        state: match.state as object,
        version: match.version,
      },
    });
    await prisma.room.update({ where: { id: match.roomId }, data: { status: 'LOBBY' } }).catch(() => {});

    const rewards = await recordMatchResult({
      matchId: match.id,
      gameId: match.gameId,
      ranked: match.ranked,
      result,
      players: match.players.map((p) => ({ userId: p.userId ?? '', playerId: p.playerId, isAI: p.isAI })),
    }).catch((err) => {
      logger.error({ err }, 'Failed to record match result');
      return new Map<string, MatchReward>();
    });

    // Each player sees their own reward (ELO change, XP, level-up).
    const sockets = await this.io.in(`room:${match.roomId}`).fetchSockets();
    for (const s of sockets) {
      const uid = (s.data as { userId: string }).userId;
      s.emit('game:over', {
        matchId: match.id,
        result,
        snapshot: this.snapshot(match, this.viewerIdFor(match, uid)),
        reward: rewards.get(uid) ?? null,
      });
    }
    this.onFinish?.(match.roomId, match.gameId, match.players.filter((p) => !p.isAI).map((p) => p.userId!), result);

    // Free memory shortly after; clients keep the final snapshot.
    setTimeout(() => {
      this.matches.delete(match.id);
      if (this.roomIndex.get(match.roomId) === match.id) this.roomIndex.delete(match.roomId);
    }, 30_000);
    logger.info({ matchId: match.id, winner: winnerSeat?.displayName ?? 'draw' }, 'Match finished');
  }

  snapshot(match: LiveMatch, viewerPlayerId: string | null = null): MatchSnapshot {
    const view = match.engine.viewFor
      ? match.engine.viewFor(match.state, viewerPlayerId)
      : match.state;
    return {
      matchId: match.id,
      roomId: match.roomId,
      gameId: match.gameId,
      state: view,
      turn: match.engine.currentTurn(match.state),
      result: match.engine.getResult(match.state),
      version: match.version,
      seats: match.players.map((p) => ({
        seat: p.seat,
        playerId: p.playerId,
        userId: p.userId,
        displayName: p.displayName,
        isAI: p.isAI,
      })),
    };
  }
}
