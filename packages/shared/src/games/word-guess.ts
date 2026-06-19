import type { GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';
import { seedFromOptions, shuffle } from './rng.js';

// ─────────────────────────────────────────────────────────────
// Shared engine for Charades / Heads Up. One performer per round;
// the rest guess. `performerSeesWord` flips who sees the word
// (Charades: actor sees it; Heads Up: everyone but the holder sees it).
// Relies on the server's per-viewer broadcast to keep the word secret.
// ─────────────────────────────────────────────────────────────

export interface WordGuessState {
  words: string[];
  wordIndex: number;
  performer: number;
  scores: Record<string, number>;
  round: number;
  totalRounds: number;
  performerSeesWord: boolean;
  players: string[];
  names: string[];
  finished: boolean;
}

export type WordGuessMove = { type: 'correct' | 'skip' | 'end' };

export function makeWordGuess(meta: GameMeta, words: string[], performerSeesWord: boolean): GameEngine<WordGuessState, WordGuessMove> {
  return {
    meta,

    createInitialState(players: PlayerSlot[], options): WordGuessState {
      const seated = players.slice().sort((a, b) => a.seat - b.seat);
      const { result } = shuffle(words, seedFromOptions(options));
      return {
        words: result,
        wordIndex: 0,
        performer: 0,
        scores: Object.fromEntries(seated.map((p) => [p.playerId, 0])),
        round: 0,
        totalRounds: Math.max(1, seated.length),
        performerSeesWord,
        players: seated.map((p) => p.playerId),
        names: seated.map((p) => p.displayName),
        finished: false,
      };
    },

    currentTurn(state) {
      return state.finished ? null : state.players[state.performer] ?? null;
    },

    legalMoves(state, playerId) {
      if (state.finished || state.players[state.performer] !== playerId) return [];
      return [{ type: 'correct' }, { type: 'skip' }, { type: 'end' }];
    },

    applyMove(state, move, playerId): MoveResult<WordGuessState> {
      if (state.finished) return fail('Game over.');
      if (state.players[state.performer] !== playerId) return fail('Only the performer can do this.');
      const next = clone(state);
      if (move.type === 'correct') { next.scores[playerId] = (next.scores[playerId] ?? 0) + 1; next.wordIndex = (next.wordIndex + 1) % next.words.length; }
      else if (move.type === 'skip') { next.wordIndex = (next.wordIndex + 1) % next.words.length; }
      else {
        next.performer = (next.performer + 1) % next.players.length;
        next.round += 1;
        next.wordIndex = (next.wordIndex + 1) % next.words.length;
        if (next.round >= next.totalRounds) next.finished = true;
      }
      return ok(next);
    },

    getResult(state): GameResult | null {
      if (!state.finished) return null;
      let winner: string | null = null;
      let top = -1;
      let tie = false;
      for (const p of state.players) {
        const s = state.scores[p] ?? 0;
        if (s > top) { top = s; winner = p; tie = false; }
        else if (s === top) tie = true;
      }
      return { winnerId: tie ? null : winner, draw: tie, scores: state.scores, reason: `${top} guessed` };
    },

    viewFor(state, viewer) {
      const performerId = state.players[state.performer];
      const allowed = state.performerSeesWord ? viewer === performerId : viewer !== performerId;
      const cur = state.wordIndex % state.words.length;
      const v = clone(state);
      v.words = state.words.map((w, i) => (i === cur && allowed ? w : ''));
      return v;
    },
  };
}

export const GUESS_WORDS = [
  'Elephant', 'Pizza', 'Guitar', 'Sunrise', 'Football', 'Rainbow', 'Helicopter', 'Snowman',
  'Volcano', 'Astronaut', 'Spider', 'Lighthouse', 'Waterfall', 'Dragon', 'Skateboard', 'Penguin',
  'Umbrella', 'Robot', 'Telescope', 'Pancake', 'Dolphin', 'Castle', 'Tornado', 'Kangaroo',
  'Bicycle', 'Campfire', 'Octopus', 'Mountain', 'Butterfly', 'Sandcastle', 'Fireworks', 'Submarine',
];
