import type { GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';
import { randomInt, seedFromOptions } from './rng.js';

// ─────────────────────────────────────────────────────────────
// Truth or Dare (workplace-friendly). Players take turns picking a
// truth or a dare and reading the prompt aloud.
// ─────────────────────────────────────────────────────────────

const TRUTHS = [
  'What’s a skill you wish you had?',
  'What’s the most embarrassing song on your playlist?',
  'What’s your go-to comfort food?',
  'What’s one thing on your bucket list?',
  'Who was your childhood hero?',
  'What’s the best advice you’ve ever received?',
  'What’s a hidden talent of yours?',
  'What app do you spend the most time on?',
  'What’s your dream holiday destination?',
  'What’s the last thing you searched online?',
];
const DARES = [
  'Talk in an accent for the next two rounds.',
  'Do your best impression of a teammate.',
  'Send a nice message to a colleague right now.',
  'Do 10 jumping jacks.',
  'Share your screen and show your wallpaper.',
  'Speak only in questions until your next turn.',
  'Give a 20-second motivational speech.',
  'Do a little victory dance.',
  'Tell a joke — make everyone groan.',
  'Use only emojis in chat until your next turn.',
];

export interface TruthOrDareState {
  players: string[];
  names: string[];
  turn: number;
  current: { kind: 'truth' | 'dare'; text: string } | null;
  round: number;
  maxRounds: number;
  rng: number;
  finished: boolean;
}

export type TruthOrDareMove = { type: 'pick'; kind: 'truth' | 'dare' } | { type: 'done' };

export const truthOrDareMeta: GameMeta = {
  id: 'truth-or-dare',
  name: 'Truth or Dare',
  category: 'OFFICE',
  minPlayers: 1,
  maxPlayers: 20,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Workplace-safe truths and dares, taking turns.',
  status: 'live',
};

export const truthOrDare: GameEngine<TruthOrDareState, TruthOrDareMove> = {
  meta: truthOrDareMeta,

  createInitialState(players: PlayerSlot[], options): TruthOrDareState {
    const seated = players.slice().sort((a, b) => a.seat - b.seat);
    return {
      players: seated.map((p) => p.playerId),
      names: seated.map((p) => p.displayName),
      turn: 0,
      current: null,
      round: 0,
      maxRounds: Math.max(4, seated.length * 3),
      rng: seedFromOptions(options),
      finished: false,
    };
  },

  currentTurn(state) {
    return state.finished ? null : state.players[state.turn] ?? null;
  },

  legalMoves(state, playerId) {
    if (state.finished || state.players[state.turn] !== playerId) return [];
    return state.current ? [{ type: 'done' }] : [{ type: 'pick', kind: 'truth' }, { type: 'pick', kind: 'dare' }];
  },

  applyMove(state, move, playerId): MoveResult<TruthOrDareState> {
    if (state.finished) return fail('Game over.');
    if (state.players[state.turn] !== playerId) return fail('Not your turn.');
    const next = clone(state);
    if (move.type === 'pick') {
      if (next.current) return fail('Finish the current prompt first.');
      const pool = move.kind === 'truth' ? TRUTHS : DARES;
      const r = randomInt(next.rng, 0, pool.length - 1);
      next.rng = r.seed;
      next.current = { kind: move.kind, text: pool[r.value]! };
      return ok(next);
    }
    // done
    if (!next.current) return fail('Pick truth or dare first.');
    next.current = null;
    next.turn = (next.turn + 1) % next.players.length;
    next.round += 1;
    if (next.round >= next.maxRounds) next.finished = true;
    return ok(next);
  },

  getResult(state): GameResult | null {
    if (!state.finished) return null;
    return { winnerId: null, draw: true, reason: 'Thanks for playing!' };
  },
};
