import type { GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';
import { rollDie, seedFromOptions } from './rng.js';

// ─────────────────────────────────────────────────────────────
// Snakes and Ladders — 1–100, dice driven, 2–4 players.
// ─────────────────────────────────────────────────────────────

export interface SnakesState {
  positions: number[]; // square 0..100 per player (0 = not yet started)
  turn: number;
  players: string[];
  rng: number;
  lastRoll: number | null;
  /** Increments on every roll — lets the UI animate even on repeated values. */
  rollCount: number;
  lastJump: { from: number; to: number; kind: 'snake' | 'ladder' } | null;
  winner: number | null;
}

export interface SnakesMove {
  type: 'roll';
}

export const snakesLaddersMeta: GameMeta = {
  id: 'snakes-ladders',
  name: 'Snakes and Ladders',
  category: 'BOARD',
  minPlayers: 2,
  maxPlayers: 4,
  supportsAI: true,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Climb the ladders, dodge the snakes, race to 100.',
  status: 'live',
};

// Classic board layout.
export const LADDERS: Record<number, number> = {
  1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100,
};
export const SNAKES: Record<number, number> = {
  16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78,
};

export const snakesLadders: GameEngine<SnakesState, SnakesMove> = {
  meta: snakesLaddersMeta,

  createInitialState(players: PlayerSlot[], options): SnakesState {
    const seats = players.length >= 2 ? players.length : 2;
    return {
      positions: Array(seats).fill(0),
      turn: 0,
      players: players.sort((a, b) => a.seat - b.seat).map((p) => p.playerId),
      rng: seedFromOptions(options),
      lastRoll: null,
      rollCount: 0,
      lastJump: null,
      winner: null,
    };
  },

  currentTurn(state) {
    if (state.winner !== null) return null;
    return state.players[state.turn] ?? null;
  },

  legalMoves(state, playerId) {
    if (state.winner !== null || state.players[state.turn] !== playerId) return [];
    return [{ type: 'roll' }];
  },

  applyMove(state, move, playerId): MoveResult<SnakesState> {
    if (state.winner !== null) return fail('Game is already over.');
    if (state.players[state.turn] !== playerId) return fail('Not your turn.');
    if (move.type !== 'roll') return fail('Roll the die to move.');

    const next = clone(state);
    const { roll, seed } = rollDie(next.rng);
    next.rng = seed;
    next.lastRoll = roll;
    next.rollCount += 1;
    next.lastJump = null;

    const target = next.positions[next.turn]! + roll;
    if (target <= 100) {
      let landed = target;
      if (LADDERS[landed] !== undefined) { next.lastJump = { from: landed, to: LADDERS[landed]!, kind: 'ladder' }; landed = LADDERS[landed]!; }
      else if (SNAKES[landed] !== undefined) { next.lastJump = { from: landed, to: SNAKES[landed]!, kind: 'snake' }; landed = SNAKES[landed]!; }
      next.positions[next.turn] = landed;
      if (landed === 100) { next.winner = next.turn; return ok(next); }
    }
    // Overshooting 100 forfeits the move. A 6 grants another turn.
    if (roll !== 6) next.turn = (next.turn + 1) % next.players.length;
    return ok(next);
  },

  getResult(state): GameResult | null {
    if (state.winner === null) return null;
    return { winnerId: state.players[state.winner]!, draw: false, reason: 'Reached 100' };
  },

  // Dice are pure luck — the "AI" just rolls.
  aiMove(state, playerId) {
    if (state.players[state.turn] !== playerId) return null;
    return { type: 'roll' };
  },
};
