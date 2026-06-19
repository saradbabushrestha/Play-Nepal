import type { GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';
import { seedFromOptions, shuffle } from './rng.js';

// ─────────────────────────────────────────────────────────────
// Nepali Quiz Challenge — simultaneous-answer trivia rounds.
// Everyone answers the current question; once all have, it scores
// and advances. `viewFor` hides the correct answer until reveal.
// ─────────────────────────────────────────────────────────────

export interface Question {
  q: string;
  options: string[];
  answer: number; // index into options
  category: string;
}

export interface QuizState {
  bank: Question[];
  round: number;
  answers: Record<string, number>[]; // per round: playerId -> option
  scores: Record<string, number>;
  players: string[];
  finished: boolean;
}

export interface QuizMove {
  option: number;
}

export const ROUNDS = 8;

export const nepaliQuizMeta: GameMeta = {
  id: 'nepali-quiz',
  name: 'Nepali Quiz Challenge',
  category: 'NEPALI_TRADITIONAL',
  minPlayers: 1,
  maxPlayers: 12,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'GK, history, geography & Loksewa — answer fast, score high.',
  status: 'live',
};

const QUESTIONS: Question[] = [
  { q: 'What is the capital of Nepal?', options: ['Pokhara', 'Kathmandu', 'Lalitpur', 'Biratnagar'], answer: 1, category: 'GK' },
  { q: 'The world’s highest peak, in Nepal, is?', options: ['Kanchenjunga', 'Lhotse', 'Mount Everest', 'Makalu'], answer: 2, category: 'Geography' },
  { q: 'The national flower of Nepal is?', options: ['Marigold', 'Lotus', 'Rhododendron (Lali Gurans)', 'Sunflower'], answer: 2, category: 'GK' },
  { q: 'The national bird of Nepal is?', options: ['Peacock', 'Danphe (Himalayan Monal)', 'Crow', 'Sparrow'], answer: 1, category: 'GK' },
  { q: 'How many provinces does Nepal have?', options: ['5', '6', '7', '8'], answer: 2, category: 'GK' },
  { q: 'The currency of Nepal is the?', options: ['Nepalese Rupee', 'Taka', 'Rupiah', 'Dollar'], answer: 0, category: 'GK' },
  { q: 'The largest lake in Nepal is?', options: ['Phewa', 'Rara', 'Tilicho', 'Begnas'], answer: 1, category: 'Geography' },
  { q: 'Which is a traditional Nepali board game?', options: ['Chess', 'Baghchal', 'Carrom', 'Ludo'], answer: 1, category: 'GK' },
  { q: 'Gautam Buddha was born in?', options: ['Kapilvastu', 'Lumbini', 'Bodhgaya', 'Kushinagar'], answer: 1, category: 'History' },
  { q: 'Nepal became a federal republic in (AD)?', options: ['2006', '2008', '2010', '2015'], answer: 1, category: 'History' },
  { q: 'The festival of lights in Nepal is?', options: ['Dashain', 'Tihar', 'Holi', 'Teej'], answer: 1, category: 'GK' },
  { q: 'The Constitution of Nepal was promulgated in (AD)?', options: ['2007', '2015', '2017', '1990'], answer: 1, category: 'Loksewa' },
];

export const nepaliQuiz: GameEngine<QuizState, QuizMove> = {
  meta: nepaliQuizMeta,

  createInitialState(players: PlayerSlot[], options): QuizState {
    const { result } = shuffle(QUESTIONS, seedFromOptions(options));
    const bank = result.slice(0, ROUNDS);
    return {
      bank,
      round: 0,
      answers: bank.map(() => ({})),
      scores: Object.fromEntries(players.map((p) => [p.playerId, 0])),
      players: players.map((p) => p.playerId),
      finished: false,
    };
  },

  // Simultaneous play — no single player "owns" the turn.
  currentTurn() {
    return null;
  },

  legalMoves(state, playerId) {
    if (state.finished || !state.players.includes(playerId)) return [];
    if (state.answers[state.round]?.[playerId] !== undefined) return [];
    const q = state.bank[state.round];
    return q ? q.options.map((_, option) => ({ option })) : [];
  },

  applyMove(state, move, playerId): MoveResult<QuizState> {
    if (state.finished) return fail('Quiz is over.');
    if (!state.players.includes(playerId)) return fail('You are not in this quiz.');
    const round = state.answers[state.round]!;
    if (round[playerId] !== undefined) return fail('You already answered this question.');
    const q = state.bank[state.round]!;
    if (move.option < 0 || move.option >= q.options.length) return fail('Invalid option.');

    const next = clone(state);
    next.answers[next.round]![playerId] = move.option;

    // Once everyone has answered, score and advance.
    if (next.players.every((p) => next.answers[next.round]![p] !== undefined)) {
      for (const p of next.players) {
        if (next.answers[next.round]![p] === q.answer) next.scores[p] = (next.scores[p] ?? 0) + 1;
      }
      next.round += 1;
      if (next.round >= next.bank.length) next.finished = true;
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
    return { winnerId: tie ? null : winner, draw: tie, scores: state.scores, reason: 'Highest score' };
  },

  // Hide the correct answer (current/future) and other players' picks.
  viewFor(state, viewer) {
    const v = clone(state);
    v.bank = state.bank.map((q, i) => {
      if (i < state.round) return q; // already revealed
      if (i === state.round) return { ...q, answer: -1 };
      return { q: '', options: [], answer: -1, category: q.category };
    });
    v.answers = state.answers.map((round, i) => {
      if (i < state.round) return round;
      if (i === state.round && viewer && round[viewer] !== undefined) return { [viewer]: round[viewer]! };
      return {};
    });
    return v;
  },
};
