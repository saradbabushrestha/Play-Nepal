import type { GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';
import { GUESS_WORDS } from './word-guess.js';
import { seedFromOptions, shuffle } from './rng.js';

// ─────────────────────────────────────────────────────────────
// Drawing & Guessing (Pictionary-style). The drawer sees the word and
// sketches it on the shared canvas (strokes go over a separate socket
// channel); everyone else types guesses. First correct guess scores.
// ─────────────────────────────────────────────────────────────

export interface DrawGuess { player: string; text: string; correct: boolean }

export interface DrawAndGuessState {
  words: string[];
  wordIndex: number;
  drawer: number;
  scores: Record<string, number>;
  round: number;
  totalRounds: number;
  recentGuesses: DrawGuess[];
  solvedBy: string | null; // who just solved the last word
  players: string[];
  names: string[];
  finished: boolean;
}

export type DrawAndGuessMove = { type: 'guess'; text: string } | { type: 'skip' } | { type: 'end' };

export const drawAndGuessMeta: GameMeta = {
  id: 'draw-and-guess',
  name: 'Drawing & Guessing',
  category: 'PARTY',
  minPlayers: 2,
  maxPlayers: 12,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'One sketches, everyone guesses — fastest guess wins.',
  status: 'live',
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export const drawAndGuess: GameEngine<DrawAndGuessState, DrawAndGuessMove> = {
  meta: drawAndGuessMeta,

  createInitialState(players: PlayerSlot[], options): DrawAndGuessState {
    const seated = players.slice().sort((a, b) => a.seat - b.seat);
    const { result } = shuffle(GUESS_WORDS, seedFromOptions(options));
    return {
      words: result,
      wordIndex: 0,
      drawer: 0,
      scores: Object.fromEntries(seated.map((p) => [p.playerId, 0])),
      round: 0,
      totalRounds: Math.max(1, seated.length),
      recentGuesses: [],
      solvedBy: null,
      players: seated.map((p) => p.playerId),
      names: seated.map((p) => p.displayName),
      finished: false,
    };
  },

  currentTurn() {
    return null; // drawer manages; guessers guess freely
  },

  legalMoves(state, playerId) {
    if (state.finished || !state.players.includes(playerId)) return [];
    if (state.players[state.drawer] === playerId) return [{ type: 'skip' }, { type: 'end' }];
    return [{ type: 'guess', text: '' }];
  },

  applyMove(state, move, playerId): MoveResult<DrawAndGuessState> {
    if (state.finished) return fail('Game over.');
    if (!state.players.includes(playerId)) return fail('You are not in this game.');
    const isDrawer = state.players[state.drawer] === playerId;
    const next = clone(state);
    const word = next.words[next.wordIndex % next.words.length]!;

    const nextWord = (advanceDrawer: boolean) => {
      next.recentGuesses = [];
      next.solvedBy = null;
      next.wordIndex = (next.wordIndex + 1) % next.words.length;
      if (advanceDrawer) {
        next.drawer = (next.drawer + 1) % next.players.length;
        next.round += 1;
        if (next.round >= next.totalRounds) next.finished = true;
      }
    };

    if (move.type === 'guess') {
      if (isDrawer) return fail('You’re drawing — you can’t guess!');
      const text = move.text.trim().slice(0, 40);
      if (!text) return fail('Type a guess.');
      const correct = norm(text) === norm(word);
      next.recentGuesses = [...next.recentGuesses, { player: playerId, text, correct }].slice(-8);
      if (correct) {
        next.scores[playerId] = (next.scores[playerId] ?? 0) + 2;
        next.scores[next.players[next.drawer]!] = (next.scores[next.players[next.drawer]!] ?? 0) + 1;
        next.solvedBy = playerId;
        nextWord(false);
      }
      return ok(next);
    }
    if (!isDrawer) return fail('Only the drawer can do that.');
    if (move.type === 'skip') { nextWord(false); return ok(next); }
    nextWord(true); // end turn
    return ok(next);
  },

  getResult(state): GameResult | null {
    if (!state.finished) return null;
    let winner: string | null = null, top = -1, tie = false;
    for (const p of state.players) {
      const s = state.scores[p] ?? 0;
      if (s > top) { top = s; winner = p; tie = false; }
      else if (s === top) tie = true;
    }
    return { winnerId: tie ? null : winner, draw: tie, scores: state.scores, reason: 'Best sketcher & guesser' };
  },

  // Only the drawer sees the word.
  viewFor(state, viewer) {
    const isDrawer = state.players[state.drawer] === viewer;
    const cur = state.wordIndex % state.words.length;
    const v = clone(state);
    v.words = state.words.map((w, i) => (i === cur && isDrawer ? w : ''));
    return v;
  },
};
