import type { GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';

// ─────────────────────────────────────────────────────────────
// Reaction Speed Test — tap when the screen turns green. The client
// measures the reaction time and submits it; the engine ranks players
// by average over N rounds (lower is better). Simultaneous.
// ─────────────────────────────────────────────────────────────

export const RS_ROUNDS = 5;
export const RS_PENALTY = 9999; // false start

export interface ReactionState {
  totalRounds: number;
  round: number;
  results: Record<string, number[]>; // playerId -> ms per round
  players: string[];
  finished: boolean;
}

export interface ReactionMove {
  ms: number;
}

export const reactionSpeedMeta: GameMeta = {
  id: 'reaction-speed',
  name: 'Reaction Speed Test',
  category: 'CASUAL',
  minPlayers: 1,
  maxPlayers: 8,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Tap the instant it turns green — fastest reflexes win.',
  status: 'live',
};

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : RS_PENALTY);

export const reactionSpeed: GameEngine<ReactionState, ReactionMove> = {
  meta: reactionSpeedMeta,

  createInitialState(players: PlayerSlot[]): ReactionState {
    return {
      totalRounds: RS_ROUNDS,
      round: 0,
      results: Object.fromEntries(players.map((p) => [p.playerId, []])),
      players: players.map((p) => p.playerId),
      finished: false,
    };
  },

  currentTurn() { return null; }, // simultaneous

  legalMoves(state, playerId) {
    if (state.finished || !state.players.includes(playerId)) return [];
    if ((state.results[playerId]?.length ?? 0) > state.round) return []; // already submitted this round
    return [{ ms: 0 }];
  },

  applyMove(state, move, playerId): MoveResult<ReactionState> {
    if (state.finished) return fail('Test complete.');
    if (!state.players.includes(playerId)) return fail('You are not in this test.');
    const mine = state.results[playerId];
    if (!mine) return fail('Unknown player.');
    if (mine.length > state.round) return fail('Already reacted this round.');

    const next = clone(state);
    const ms = Number.isFinite(move.ms) ? Math.max(0, Math.min(RS_PENALTY, Math.round(move.ms))) : RS_PENALTY;
    next.results[playerId]!.push(ms);

    // Advance when everyone has reacted this round.
    if (next.players.every((p) => (next.results[p]?.length ?? 0) > next.round)) {
      next.round += 1;
      if (next.round >= next.totalRounds) next.finished = true;
    }
    return ok(next);
  },

  getResult(state): GameResult | null {
    if (!state.finished) return null;
    let winner: string | null = null;
    let bestAvg = Infinity;
    let tie = false;
    const scores: Record<string, number> = {};
    for (const p of state.players) {
      const a = Math.round(avg(state.results[p] ?? []));
      scores[p] = a;
      if (a < bestAvg) { bestAvg = a; winner = p; tie = false; }
      else if (a === bestAvg) tie = true;
    }
    return { winnerId: tie ? null : winner, draw: tie, scores, reason: `Avg ${Math.round(bestAvg)}ms` };
  },
};
