import type { GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';
import { randomInt, seedFromOptions } from './rng.js';

// ─────────────────────────────────────────────────────────────
// Spin the Wheel — an office picker. The wheel is divided among the
// players (or seats); the host spins and the wheel lands on one.
// ─────────────────────────────────────────────────────────────

export interface SpinWheelState {
  players: string[];
  names: string[];
  result: number | null; // index landed on
  turns: number;         // wheel rotation (turns), for the spin animation
  spun: boolean;
  rng: number;
}

export interface SpinWheelMove {
  type: 'spin';
}

export const spinTheWheelMeta: GameMeta = {
  id: 'spin-the-wheel',
  name: 'Spin the Wheel',
  category: 'OFFICE',
  minPlayers: 1,
  maxPlayers: 12,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Spin to randomly pick a teammate — standups, prizes, dares.',
  status: 'live',
};

export const spinTheWheel: GameEngine<SpinWheelState, SpinWheelMove> = {
  meta: spinTheWheelMeta,

  createInitialState(players: PlayerSlot[], options): SpinWheelState {
    const seated = players.slice().sort((a, b) => a.seat - b.seat);
    return {
      players: seated.map((p) => p.playerId),
      names: seated.map((p) => p.displayName),
      result: null,
      turns: 0,
      spun: false,
      rng: seedFromOptions(options),
    };
  },

  // Only the host (first seat) may spin.
  currentTurn(state) {
    return state.spun ? null : state.players[0] ?? null;
  },

  legalMoves(state, playerId) {
    if (state.spun || state.players[0] !== playerId) return [];
    return [{ type: 'spin' }];
  },

  applyMove(state, move, playerId): MoveResult<SpinWheelState> {
    if (state.spun) return fail('The wheel has already been spun.');
    if (state.players[0] !== playerId) return fail('Only the host can spin.');
    if (move.type !== 'spin') return fail('Invalid move.');

    const next = clone(state);
    const r1 = randomInt(next.rng, 0, next.names.length - 1);
    const r2 = randomInt(r1.seed, 3, 6); // extra full rotations for the animation
    next.rng = r2.seed;
    next.result = r1.value;
    next.turns = r2.value;
    next.spun = true;
    return ok(next);
  },

  getResult(state): GameResult | null {
    if (!state.spun || state.result === null) return null;
    return { winnerId: state.players[state.result] ?? null, draw: false, reason: `🎯 ${state.names[state.result]} is chosen!` };
  },
};
