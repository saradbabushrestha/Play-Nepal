import type { GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';
import { seedFromOptions, shuffle } from './rng.js';

// ─────────────────────────────────────────────────────────────
// Reusable simultaneous-answer quiz engine. A bank of questions is
// shuffled per match; everyone answers the current question and once
// all have, it scores and advances. `viewFor` hides the answer.
// ─────────────────────────────────────────────────────────────

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  category: string;
}

export interface GenericQuizState {
  bank: QuizQuestion[];
  round: number;
  answers: Record<string, number>[];
  scores: Record<string, number>;
  players: string[];
  finished: boolean;
}

export interface GenericQuizMove {
  option: number;
}

export function makeQuizEngine(
  meta: GameMeta,
  questions: QuizQuestion[],
  rounds = 8,
): GameEngine<GenericQuizState, GenericQuizMove> {
  return {
    meta,

    createInitialState(players: PlayerSlot[], options): GenericQuizState {
      const { result } = shuffle(questions, seedFromOptions(options));
      const bank = result.slice(0, Math.min(rounds, result.length));
      return {
        bank,
        round: 0,
        answers: bank.map(() => ({})),
        scores: Object.fromEntries(players.map((p) => [p.playerId, 0])),
        players: players.map((p) => p.playerId),
        finished: false,
      };
    },

    currentTurn() {
      return null; // simultaneous
    },

    legalMoves(state, playerId) {
      if (state.finished || !state.players.includes(playerId)) return [];
      if (state.answers[state.round]?.[playerId] !== undefined) return [];
      const q = state.bank[state.round];
      return q ? q.options.map((_, option) => ({ option })) : [];
    },

    applyMove(state, move, playerId): MoveResult<GenericQuizState> {
      if (state.finished) return fail('Quiz is over.');
      if (!state.players.includes(playerId)) return fail('You are not in this quiz.');
      const round = state.answers[state.round]!;
      if (round[playerId] !== undefined) return fail('You already answered.');
      const q = state.bank[state.round]!;
      if (move.option < 0 || move.option >= q.options.length) return fail('Invalid option.');

      const next = clone(state);
      next.answers[next.round]![playerId] = move.option;
      if (next.players.every((p) => next.answers[next.round]![p] !== undefined)) {
        for (const p of next.players) if (next.answers[next.round]![p] === q.answer) next.scores[p] = (next.scores[p] ?? 0) + 1;
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

    viewFor(state, viewer) {
      const v = clone(state);
      v.bank = state.bank.map((q, i) => {
        if (i < state.round) return q;
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
}
