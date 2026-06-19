import type { GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';
import { seedFromOptions, shuffle } from './rng.js';

// ─────────────────────────────────────────────────────────────
// Most Likely To — each round, everyone votes for the teammate most
// likely to do something. The most-voted player overall "wins".
// ─────────────────────────────────────────────────────────────

const PROMPTS = [
  'become a millionaire',
  'forget their own birthday',
  'survive a zombie apocalypse',
  'become famous',
  'win a dance-off',
  'reply to emails at 3am',
  'go on an adventure with no plan',
  'start their own company',
  'win a quiz night',
  'be late to their own wedding',
  'adopt ten pets',
  'travel to every continent',
];

export interface MostLikelyState {
  bank: string[];
  round: number;
  votes: Record<string, string>[]; // voter -> target playerId, per round
  players: string[];
  names: string[];
  finished: boolean;
}

export interface MostLikelyMove {
  target: string; // playerId voted for
}

export const mostLikelyToMeta: GameMeta = {
  id: 'most-likely-to',
  name: 'Most Likely To',
  category: 'OFFICE',
  minPlayers: 1,
  maxPlayers: 20,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Vote on which teammate is most likely to…',
  status: 'live',
};

const ROUNDS = 8;

export const mostLikelyTo: GameEngine<MostLikelyState, MostLikelyMove> = {
  meta: mostLikelyToMeta,

  createInitialState(players: PlayerSlot[], options): MostLikelyState {
    const seated = players.slice().sort((a, b) => a.seat - b.seat);
    const { result } = shuffle(PROMPTS, seedFromOptions(options));
    const bank = result.slice(0, ROUNDS);
    return {
      bank,
      round: 0,
      votes: bank.map(() => ({})),
      players: seated.map((p) => p.playerId),
      names: seated.map((p) => p.displayName),
      finished: false,
    };
  },

  currentTurn() {
    return null; // simultaneous
  },

  legalMoves(state, playerId) {
    if (state.finished || !state.players.includes(playerId)) return [];
    if (state.votes[state.round]?.[playerId]) return [];
    return state.players.map((target) => ({ target }));
  },

  applyMove(state, move, playerId): MoveResult<MostLikelyState> {
    if (state.finished) return fail('Game over.');
    if (!state.players.includes(playerId)) return fail('You are not in this game.');
    if (!state.players.includes(move.target)) return fail('Invalid vote.');
    if (state.votes[state.round]?.[playerId]) return fail('You already voted.');

    const next = clone(state);
    next.votes[next.round]![playerId] = move.target;
    if (next.players.every((p) => next.votes[next.round]![p])) {
      next.round += 1;
      if (next.round >= next.bank.length) next.finished = true;
    }
    return ok(next);
  },

  getResult(state): GameResult | null {
    if (!state.finished) return null;
    const tally: Record<string, number> = Object.fromEntries(state.players.map((p) => [p, 0]));
    for (const round of state.votes) for (const target of Object.values(round)) tally[target] = (tally[target] ?? 0) + 1;
    let winner: string | null = null;
    let top = -1;
    let tie = false;
    for (const p of state.players) {
      if (tally[p]! > top) { top = tally[p]!; winner = p; tie = false; }
      else if (tally[p] === top) tie = true;
    }
    return { winnerId: tie ? null : winner, draw: tie, scores: tally, reason: 'Most likely of all!' };
  },
};
