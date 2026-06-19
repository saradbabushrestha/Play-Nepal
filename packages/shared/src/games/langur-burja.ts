import type { GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';
import { randomInt, seedFromOptions } from './rng.js';

// ─────────────────────────────────────────────────────────────
// Langur Burja — the festive Nepali dice betting game. Each round
// every player stakes on one of six symbols; three dice are rolled
// and you win stake × (times your symbol appears), or lose your stake.
// ─────────────────────────────────────────────────────────────

export const LB_SYMBOLS = ['🐯', '👑', '♠️', '♥️', '♦️', '♣️']; // Langur, Burja, Spade, Heart, Diamond, Club
export const LB_START_POINTS = 1000;
export const LB_ROUNDS = 8;

export interface LangurBurjaState {
  round: number;
  totalRounds: number;
  points: Record<string, number>;
  bets: Record<string, { symbol: number; amount: number }>;
  lastRoll: number[] | null;
  lastPayouts: Record<string, number> | null;
  players: string[];
  rng: number;
  finished: boolean;
}

export interface LangurBurjaMove {
  symbol: number; // 0..5
  amount: number; // 0 = sit out
}

export const langurBurjaMeta: GameMeta = {
  id: 'langur-burja',
  name: 'Langur Burja',
  category: 'NEPALI_TRADITIONAL',
  minPlayers: 1,
  maxPlayers: 8,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Stake on a symbol, roll three dice — a festive Nepali classic.',
  status: 'live',
};

export const langurBurja: GameEngine<LangurBurjaState, LangurBurjaMove> = {
  meta: langurBurjaMeta,

  createInitialState(players: PlayerSlot[], options): LangurBurjaState {
    return {
      round: 0,
      totalRounds: LB_ROUNDS,
      points: Object.fromEntries(players.map((p) => [p.playerId, LB_START_POINTS])),
      bets: {},
      lastRoll: null,
      lastPayouts: null,
      players: players.map((p) => p.playerId),
      rng: seedFromOptions(options),
      finished: false,
    };
  },

  currentTurn() {
    return null; // simultaneous betting
  },

  legalMoves(state, playerId) {
    if (state.finished || !state.players.includes(playerId) || state.bets[playerId]) return [];
    return [{ symbol: 0, amount: 0 }]; // sentinel; any 0..5 + valid amount is allowed
  },

  applyMove(state, move, playerId): MoveResult<LangurBurjaState> {
    if (state.finished) return fail('Game over.');
    if (!state.players.includes(playerId)) return fail('You are not in this game.');
    if (state.bets[playerId]) return fail('You already placed your bet this round.');
    if (move.symbol < 0 || move.symbol >= LB_SYMBOLS.length) return fail('Invalid symbol.');
    const amount = Math.floor(move.amount);
    if (amount < 0 || amount > (state.points[playerId] ?? 0)) return fail('Invalid stake.');

    const next = clone(state);
    next.bets[playerId] = { symbol: move.symbol, amount };

    // Roll once everyone has staked.
    if (next.players.every((p) => next.bets[p])) {
      let s = next.rng;
      const dice: number[] = [];
      for (let i = 0; i < 3; i++) { const r = randomInt(s, 0, LB_SYMBOLS.length - 1); s = r.seed; dice.push(r.value); }
      next.rng = s;
      next.lastRoll = dice;
      next.lastPayouts = {};
      for (const p of next.players) {
        const bet = next.bets[p]!;
        const hits = dice.filter((d) => d === bet.symbol).length;
        const net = bet.amount === 0 ? 0 : hits > 0 ? bet.amount * hits : -bet.amount;
        next.points[p] = (next.points[p] ?? 0) + net;
        next.lastPayouts[p] = net;
      }
      next.bets = {};
      next.round += 1;
      if (next.round >= next.totalRounds) next.finished = true;
    }
    return ok(next);
  },

  getResult(state): GameResult | null {
    if (!state.finished) return null;
    let winner: string | null = null;
    let top = -Infinity;
    let tie = false;
    for (const p of state.players) {
      const pts = state.points[p] ?? 0;
      if (pts > top) { top = pts; winner = p; tie = false; }
      else if (pts === top) tie = true;
    }
    return { winnerId: tie ? null : winner, draw: tie, scores: state.points, reason: `Richest with ${top} pts` };
  },
};
