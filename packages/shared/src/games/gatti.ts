import type { GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';

// ─────────────────────────────────────────────────────────────
// Gatti — a digital take on the Nepali stones game. Toss a stone and
// "grab" it by tapping when the marker is in the shrinking target
// zone. Clear 5 levels of increasing difficulty.
// ─────────────────────────────────────────────────────────────

export const GATTI_MAX_LEVEL = 5;
export const GATTI_LIVES = 3;

export interface GattiState {
  level: number;       // 1..5
  inLevel: number;     // successful grabs in the current level
  stonesGrabbed: number;
  lives: number;
  status: 'playing' | 'won' | 'lost';
  player: string;
}

export interface GattiMove {
  type: 'grab';
  success: boolean; // the client decides from the timing window
}

export const gattiMeta: GameMeta = {
  id: 'gatti',
  name: 'Gatti',
  category: 'NEPALI_TRADITIONAL',
  minPlayers: 1,
  maxPlayers: 1,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Toss & grab the stones with perfect timing — a Nepali classic.',
  status: 'live',
};

export const gatti: GameEngine<GattiState, GattiMove> = {
  meta: gattiMeta,

  createInitialState(players: PlayerSlot[]): GattiState {
    return { level: 1, inLevel: 0, stonesGrabbed: 0, lives: GATTI_LIVES, status: 'playing', player: players[0]?.playerId ?? 'seat-0' };
  },

  currentTurn(state) {
    return state.status === 'playing' ? state.player : null;
  },

  legalMoves(state, playerId) {
    if (state.status !== 'playing' || state.player !== playerId) return [];
    return [{ type: 'grab', success: true }];
  },

  applyMove(state, move, playerId): MoveResult<GattiState> {
    if (state.status !== 'playing') return fail('Game over.');
    if (state.player !== playerId) return fail('Not your game.');
    if (move.type !== 'grab') return fail('Invalid move.');

    const next = clone(state);
    if (move.success) {
      next.stonesGrabbed += 1;
      next.inLevel += 1;
      if (next.inLevel >= next.level) {
        next.level += 1;
        next.inLevel = 0;
        if (next.level > GATTI_MAX_LEVEL) next.status = 'won';
      }
    } else {
      next.lives -= 1;
      next.inLevel = 0; // drop the stones — restart this level's run
      if (next.lives <= 0) next.status = 'lost';
    }
    return ok(next);
  },

  getResult(state): GameResult | null {
    if (state.status === 'playing') return null;
    return {
      winnerId: state.player,
      draw: false,
      scores: { stones: state.stonesGrabbed, level: state.level },
      reason: state.status === 'won' ? 'All levels cleared!' : `Grabbed ${state.stonesGrabbed} stones`,
    };
  },
};
