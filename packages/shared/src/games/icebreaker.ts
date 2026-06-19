import type { GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';
import { seedFromOptions, shuffle } from './rng.js';

// ─────────────────────────────────────────────────────────────
// Icebreaker Generator — the host reveals a prompt each round for
// the group to discuss. Endless conversation starters.
// ─────────────────────────────────────────────────────────────

const PROMPTS = [
  'If you could have dinner with anyone, who would it be?',
  'What’s the best trip you’ve ever taken?',
  'What’s a small thing that makes your day better?',
  'If you could instantly master one skill, what would it be?',
  'What’s your favourite way to unwind after work?',
  'What’s a book, show, or film you’d recommend to everyone?',
  'What did you want to be when you grew up?',
  'What’s the best piece of feedback you’ve received?',
  'If you had an extra hour every day, how would you spend it?',
  'What’s a fun fact most people don’t know about you?',
  'What’s your favourite local food spot?',
  'If you could live anywhere for a year, where would it be?',
  'What’s a goal you’re working towards right now?',
  'What’s the most useful app on your phone?',
  'What’s your go-to karaoke song?',
];

export interface IcebreakerState {
  prompts: string[];
  index: number;
  players: string[];
  finished: boolean;
}

export interface IcebreakerMove {
  type: 'next';
}

export const icebreakerMeta: GameMeta = {
  id: 'icebreaker',
  name: 'Icebreaker Generator',
  category: 'OFFICE',
  minPlayers: 1,
  maxPlayers: 30,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Endless conversation starters to warm up the room.',
  status: 'live',
};

export const icebreaker: GameEngine<IcebreakerState, IcebreakerMove> = {
  meta: icebreakerMeta,

  createInitialState(players: PlayerSlot[], options): IcebreakerState {
    const { result } = shuffle(PROMPTS, seedFromOptions(options));
    return {
      prompts: result,
      index: 0,
      players: players.slice().sort((a, b) => a.seat - b.seat).map((p) => p.playerId),
      finished: false,
    };
  },

  currentTurn(state) {
    return state.finished ? null : state.players[0] ?? null; // host advances
  },

  legalMoves(state, playerId) {
    if (state.finished || state.players[0] !== playerId) return [];
    return [{ type: 'next' }];
  },

  applyMove(state, move, playerId): MoveResult<IcebreakerState> {
    if (state.finished) return fail('No more prompts.');
    if (state.players[0] !== playerId) return fail('Only the host can advance.');
    if (move.type !== 'next') return fail('Invalid move.');
    const next = clone(state);
    next.index += 1;
    if (next.index >= next.prompts.length) next.finished = true;
    return ok(next);
  },

  getResult(state): GameResult | null {
    if (!state.finished) return null;
    return { winnerId: null, draw: true, reason: 'Out of prompts — well broken, ice!' };
  },
};
