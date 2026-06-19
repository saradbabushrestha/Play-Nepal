import type { GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';
import { randomInt, seedFromOptions } from './rng.js';

// ─────────────────────────────────────────────────────────────
// Math Challenge — simultaneous arithmetic race over N rounds.
// Problems are generated from the match seed (deterministic/replayable).
// ─────────────────────────────────────────────────────────────

export interface Problem {
  a: number;
  b: number;
  op: '+' | '-' | '×';
  answer: number;
}

export interface MathState {
  problems: Problem[];
  round: number;
  answers: Record<string, number>[]; // per round: playerId -> submitted answer
  scores: Record<string, number>;
  players: string[];
  finished: boolean;
}

export interface MathMove {
  answer: number;
}

export const MATH_ROUNDS = 10;

export const mathChallengeMeta: GameMeta = {
  id: 'math-challenge',
  name: 'Math Challenge',
  category: 'EDUCATIONAL',
  minPlayers: 1,
  maxPlayers: 8,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Race the clock and your rivals through quick arithmetic.',
  status: 'live',
};

function generate(seed: number, count: number): Problem[] {
  const problems: Problem[] = [];
  let s = seed;
  for (let i = 0; i < count; i++) {
    const opPick = randomInt(s, 0, 2); s = opPick.seed;
    const op = (['+', '-', '×'] as const)[opPick.value]!;
    if (op === '×') {
      const ra = randomInt(s, 2, 12); s = ra.seed;
      const rb = randomInt(s, 2, 12); s = rb.seed;
      problems.push({ a: ra.value, b: rb.value, op, answer: ra.value * rb.value });
    } else {
      const ra = randomInt(s, 10, 99); s = ra.seed;
      const rb = randomInt(s, 1, op === '-' ? ra.value : 99); s = rb.seed;
      problems.push({ a: ra.value, b: rb.value, op, answer: op === '+' ? ra.value + rb.value : ra.value - rb.value });
    }
  }
  return problems;
}

export const mathChallenge: GameEngine<MathState, MathMove> = {
  meta: mathChallengeMeta,

  createInitialState(players: PlayerSlot[], options): MathState {
    const problems = generate(seedFromOptions(options), MATH_ROUNDS);
    return {
      problems,
      round: 0,
      answers: problems.map(() => ({})),
      scores: Object.fromEntries(players.map((p) => [p.playerId, 0])),
      players: players.map((p) => p.playerId),
      finished: false,
    };
  },

  currentTurn() {
    return null; // simultaneous
  },

  legalMoves(state, playerId) {
    // Any integer is a candidate; we don't enumerate. Return a sentinel so the
    // server/AI know whether the player may still answer this round.
    if (state.finished || !state.players.includes(playerId)) return [];
    if (state.answers[state.round]?.[playerId] !== undefined) return [];
    return [{ answer: 0 }];
  },

  applyMove(state, move, playerId): MoveResult<MathState> {
    if (state.finished) return fail('Challenge is over.');
    if (!state.players.includes(playerId)) return fail('You are not in this challenge.');
    if (!Number.isFinite(move.answer)) return fail('Enter a number.');
    const round = state.answers[state.round]!;
    if (round[playerId] !== undefined) return fail('You already answered this round.');

    const next = clone(state);
    next.answers[next.round]![playerId] = Math.trunc(move.answer);

    if (next.players.every((p) => next.answers[next.round]![p] !== undefined)) {
      const correct = next.problems[next.round]!.answer;
      for (const p of next.players) {
        if (next.answers[next.round]![p] === correct) next.scores[p] = (next.scores[p] ?? 0) + 1;
      }
      next.round += 1;
      if (next.round >= next.problems.length) next.finished = true;
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
    return { winnerId: tie ? null : winner, draw: tie, scores: state.scores, reason: 'Most correct answers' };
  },

  // Hide the answer (current/future) and other players' submissions.
  viewFor(state, viewer) {
    const v = clone(state);
    v.problems = state.problems.map((p, i) => (i <= state.round ? { ...p, answer: i < state.round ? p.answer : -1 } : { a: 0, b: 0, op: '+', answer: -1 }));
    v.answers = state.answers.map((round, i) => {
      if (i < state.round) return round;
      if (i === state.round && viewer && round[viewer] !== undefined) return { [viewer]: round[viewer]! };
      return {};
    });
    return v;
  },
};
