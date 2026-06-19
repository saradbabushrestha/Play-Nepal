import type { GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';
import { seedFromOptions, shuffle } from './rng.js';

// ─────────────────────────────────────────────────────────────
// Would You Rather — a party game. Two options each round; everyone
// votes and watches the split. No winner, just great debates.
// ─────────────────────────────────────────────────────────────

export interface WYRPrompt { a: string; b: string }

export interface WouldYouRatherState {
  bank: WYRPrompt[];
  round: number;
  votes: Record<string, 'a' | 'b'>[]; // per round
  players: string[];
  finished: boolean;
}

export interface WouldYouRatherMove {
  choice: 'a' | 'b';
}

export const ROUNDS = 8;

export const wouldYouRatherMeta: GameMeta = {
  id: 'would-you-rather',
  name: 'Would You Rather',
  category: 'PARTY',
  minPlayers: 1,
  maxPlayers: 16,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Two options, one tough choice — see how the room splits.',
  status: 'live',
};

const PROMPTS: WYRPrompt[] = [
  { a: 'Have unlimited momo for life', b: 'Have unlimited chowmein for life' },
  { a: 'Be able to fly', b: 'Be able to turn invisible' },
  { a: 'Trek to Everest Base Camp', b: 'Relax on a beach for a week' },
  { a: 'Always be 10 minutes early', b: 'Always be 20 minutes late' },
  { a: 'Live without music', b: 'Live without movies' },
  { a: 'Have a rewind button for life', b: 'Have a pause button for life' },
  { a: 'Work 4 long days', b: 'Work 5 short days' },
  { a: 'Be the funniest person in the room', b: 'Be the smartest person in the room' },
  { a: 'Only message in voice notes', b: 'Only message in text' },
  { a: 'Have free coffee forever', b: 'Have free wifi forever' },
  { a: 'Explore space', b: 'Explore the deep ocean' },
  { a: 'Always know when someone is lying', b: 'Always get away with lying' },
];

export const wouldYouRather: GameEngine<WouldYouRatherState, WouldYouRatherMove> = {
  meta: wouldYouRatherMeta,

  createInitialState(players: PlayerSlot[], options): WouldYouRatherState {
    const { result } = shuffle(PROMPTS, seedFromOptions(options));
    const bank = result.slice(0, ROUNDS);
    return { bank, round: 0, votes: bank.map(() => ({})), players: players.map((p) => p.playerId), finished: false };
  },

  currentTurn() {
    return null; // simultaneous
  },

  legalMoves(state, playerId) {
    if (state.finished || !state.players.includes(playerId)) return [];
    if (state.votes[state.round]?.[playerId]) return [];
    return [{ choice: 'a' }, { choice: 'b' }];
  },

  applyMove(state, move, playerId): MoveResult<WouldYouRatherState> {
    if (state.finished) return fail('Game over.');
    if (!state.players.includes(playerId)) return fail('You are not in this game.');
    if (state.votes[state.round]?.[playerId]) return fail('You already voted.');
    if (move.choice !== 'a' && move.choice !== 'b') return fail('Invalid choice.');

    const next = clone(state);
    next.votes[next.round]![playerId] = move.choice;
    if (next.players.every((p) => next.votes[next.round]![p])) {
      next.round += 1;
      if (next.round >= next.bank.length) next.finished = true;
    }
    return ok(next);
  },

  getResult(state): GameResult | null {
    if (!state.finished) return null;
    return { winnerId: null, draw: true, reason: 'Thanks for playing — great debates!' };
  },
};
