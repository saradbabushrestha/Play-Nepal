import type { GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';
import { seedFromOptions, shuffle } from './rng.js';

// ─────────────────────────────────────────────────────────────
// Guess the Employee — everyone secretly submits a fun fact about
// themselves, then the group guesses who each fact belongs to.
// ─────────────────────────────────────────────────────────────

export interface GuessEmployeeState {
  phase: 'collect' | 'guess';
  facts: Record<string, string>;
  factOrder: string[];
  round: number;
  currentFactText: string;
  guesses: Record<string, string>;
  scores: Record<string, number>;
  lastReveal: { authorName: string; fact: string; correct: number } | null;
  players: string[];
  names: string[];
  rng: number;
  finished: boolean;
}

export type GuessEmployeeMove = { type: 'fact'; text: string } | { type: 'guess'; target: string };

export const guessTheEmployeeMeta: GameMeta = {
  id: 'guess-the-employee',
  name: 'Guess the Employee',
  category: 'OFFICE',
  minPlayers: 3,
  maxPlayers: 20,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Submit a fun fact, then guess whose secret is whose.',
  status: 'live',
};

export const guessTheEmployee: GameEngine<GuessEmployeeState, GuessEmployeeMove> = {
  meta: guessTheEmployeeMeta,

  createInitialState(players: PlayerSlot[], options): GuessEmployeeState {
    const seated = players.slice().sort((a, b) => a.seat - b.seat);
    return {
      phase: 'collect',
      facts: {},
      factOrder: [],
      round: 0,
      currentFactText: '',
      guesses: {},
      scores: Object.fromEntries(seated.map((p) => [p.playerId, 0])),
      lastReveal: null,
      players: seated.map((p) => p.playerId),
      names: seated.map((p) => p.displayName),
      rng: seedFromOptions(options),
      finished: false,
    };
  },

  currentTurn() {
    return null;
  },

  legalMoves(state, playerId) {
    if (state.finished || !state.players.includes(playerId)) return [];
    if (state.phase === 'collect') return state.facts[playerId] !== undefined ? [] : [{ type: 'fact', text: '' }];
    const author = state.factOrder[state.round];
    if (playerId === author || state.guesses[playerId] !== undefined) return [];
    return state.players.map((target) => ({ type: 'guess', target }));
  },

  applyMove(state, move, playerId): MoveResult<GuessEmployeeState> {
    if (state.finished) return fail('Game over.');
    if (!state.players.includes(playerId)) return fail('You are not in this game.');
    const next = clone(state);

    if (move.type === 'fact') {
      if (next.phase !== 'collect') return fail('Guessing has started.');
      if (next.facts[playerId] !== undefined) return fail('You already submitted a fact.');
      const text = move.text.trim().slice(0, 140);
      if (!text) return fail('Write a fun fact!');
      next.facts[playerId] = text;
      if (next.players.every((p) => next.facts[p] !== undefined)) {
        next.factOrder = shuffle(next.players, next.rng).result;
        next.round = 0;
        next.currentFactText = next.facts[next.factOrder[0]!]!;
        next.lastReveal = null;
        next.phase = 'guess';
      }
      return ok(next);
    }

    // guess
    if (next.phase !== 'guess') return fail('It is not guessing time.');
    const author = next.factOrder[next.round]!;
    if (playerId === author) return fail('That is your own fact!');
    if (next.guesses[playerId] !== undefined) return fail('You already guessed.');
    if (!next.players.includes(move.target)) return fail('Invalid guess.');
    next.guesses[playerId] = move.target;

    const guessers = next.players.filter((p) => p !== author);
    if (guessers.every((p) => next.guesses[p] !== undefined)) {
      let correct = 0;
      for (const g of guessers) if (next.guesses[g] === author) { next.scores[g] = (next.scores[g] ?? 0) + 1; correct++; }
      next.lastReveal = { authorName: next.names[next.players.indexOf(author)]!, fact: next.currentFactText, correct };
      next.round += 1;
      if (next.round >= next.factOrder.length) next.finished = true;
      else { next.currentFactText = next.facts[next.factOrder[next.round]!]!; next.guesses = {}; }
    }
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
    return { winnerId: tie ? null : winner, draw: tie, scores: state.scores, reason: 'Sharpest guesser' };
  },

  // Hide facts + authorship; show only the current fact text and own data.
  viewFor(state, viewer) {
    const v = clone(state);
    v.facts = viewer && state.facts[viewer] !== undefined ? { [viewer]: state.facts[viewer]! } : {};
    v.factOrder = [];
    v.guesses = viewer && state.guesses[viewer] !== undefined ? { [viewer]: state.guesses[viewer]! } : {};
    return v;
  },
};
