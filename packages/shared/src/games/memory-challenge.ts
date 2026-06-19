import type { GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';
import { randomInt, seedFromOptions } from './rng.js';

// ─────────────────────────────────────────────────────────────
// Memory Challenge (Simon) — watch a growing colour sequence and
// repeat it. Single-player; `viewFor` hides the un-reached tail.
// ─────────────────────────────────────────────────────────────

export const MC_COLORS = 4;
export const MC_MAX = 20;

export interface MemoryChallengeState {
  sequence: number[]; // colours 0..3
  round: number;      // length to repeat this round
  inputIndex: number; // progress repeating the current round
  status: 'playing' | 'won' | 'lost';
  score: number;      // rounds completed
  player: string;
}

export interface MemoryChallengeMove {
  color: number; // 0..3
}

export const memoryChallengeMeta: GameMeta = {
  id: 'memory-challenge',
  name: 'Memory Challenge',
  category: 'EDUCATIONAL',
  minPlayers: 1,
  maxPlayers: 1,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Watch the pattern, then repeat it — how far can you go?',
  status: 'live',
};

export const memoryChallenge: GameEngine<MemoryChallengeState, MemoryChallengeMove> = {
  meta: memoryChallengeMeta,

  createInitialState(players: PlayerSlot[], options): MemoryChallengeState {
    const sequence: number[] = [];
    let s = seedFromOptions(options);
    for (let i = 0; i < MC_MAX; i++) { const r = randomInt(s, 0, MC_COLORS - 1); s = r.seed; sequence.push(r.value); }
    return { sequence, round: 1, inputIndex: 0, status: 'playing', score: 0, player: players[0]?.playerId ?? 'seat-0' };
  },

  currentTurn(state) { return state.status === 'playing' ? state.player : null; },

  legalMoves(state, playerId) {
    if (state.status !== 'playing' || state.player !== playerId) return [];
    return Array.from({ length: MC_COLORS }, (_, color) => ({ color }));
  },

  applyMove(state, move, playerId): MoveResult<MemoryChallengeState> {
    if (state.status !== 'playing') return fail('Game over.');
    if (state.player !== playerId) return fail('Not your game.');
    if (move.color < 0 || move.color >= MC_COLORS) return fail('Invalid colour.');

    const next = clone(state);
    if (move.color !== next.sequence[next.inputIndex]) {
      next.status = 'lost';
      return ok(next);
    }
    next.inputIndex += 1;
    if (next.inputIndex >= next.round) {
      next.score = next.round;
      next.inputIndex = 0;
      next.round += 1;
      if (next.round > MC_MAX) next.status = 'won';
    }
    return ok(next);
  },

  getResult(state): GameResult | null {
    if (state.status === 'playing') return null;
    return {
      winnerId: state.player, draw: false, scores: { rounds: state.score },
      reason: state.status === 'won' ? 'Perfect memory!' : `Reached round ${state.score}`,
    };
  },

  // Only reveal the sequence up to the current round.
  viewFor(state) {
    return { ...clone(state), sequence: state.sequence.slice(0, state.round) };
  },
};
