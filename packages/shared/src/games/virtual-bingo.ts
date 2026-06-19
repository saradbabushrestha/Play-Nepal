import type { GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';
import { seedFromOptions, shuffle } from './rng.js';

// ─────────────────────────────────────────────────────────────
// Virtual Bingo — 5×5 cards, the host calls numbers, players mark
// their card, first to a full line claims BINGO.
// ─────────────────────────────────────────────────────────────

export interface BingoState {
  cards: Record<string, number[]>;   // 25 cells, index 12 = 0 (free)
  marked: Record<string, boolean[]>;
  callOrder: number[];                // shuffled 1..75
  callIndex: number;                  // how many called so far
  players: string[];
  names: string[];
  winner: string | null;
}

export type BingoMove = { type: 'call' } | { type: 'mark'; cell: number } | { type: 'bingo' };

export const virtualBingoMeta: GameMeta = {
  id: 'virtual-bingo',
  name: 'Virtual Bingo',
  category: 'OFFICE',
  minPlayers: 1,
  maxPlayers: 50,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Classic bingo for remote teams — mark your card, shout BINGO!',
  status: 'live',
};

const LINES: number[][] = (() => {
  const lines: number[][] = [];
  for (let r = 0; r < 5; r++) lines.push([0, 1, 2, 3, 4].map((c) => r * 5 + c));
  for (let c = 0; c < 5; c++) lines.push([0, 1, 2, 3, 4].map((r) => r * 5 + c));
  lines.push([0, 6, 12, 18, 24]);
  lines.push([4, 8, 12, 16, 20]);
  return lines;
})();

function makeCard(seed: number): { card: number[]; seed: number } {
  const card = Array(25).fill(0);
  let s = seed;
  for (let col = 0; col < 5; col++) {
    const pool = Array.from({ length: 15 }, (_, i) => col * 15 + i + 1);
    const sh = shuffle(pool, s); s = sh.seed;
    for (let row = 0; row < 5; row++) card[row * 5 + col] = sh.result[row]!;
  }
  card[12] = 0; // free centre
  return { card, seed: s };
}

export const virtualBingo: GameEngine<BingoState, BingoMove> = {
  meta: virtualBingoMeta,

  createInitialState(players: PlayerSlot[], options): BingoState {
    const seated = players.slice().sort((a, b) => a.seat - b.seat);
    let s = seedFromOptions(options);
    const cards: Record<string, number[]> = {};
    const marked: Record<string, boolean[]> = {};
    for (const p of seated) {
      const mk = makeCard(s); s = mk.seed;
      cards[p.playerId] = mk.card;
      marked[p.playerId] = mk.card.map((_, i) => i === 12); // centre free
    }
    const order = shuffle(Array.from({ length: 75 }, (_, i) => i + 1), s);
    return {
      cards, marked, callOrder: order.result, callIndex: 0,
      players: seated.map((p) => p.playerId), names: seated.map((p) => p.displayName), winner: null,
    };
  },

  currentTurn() {
    return null; // host calls, everyone marks
  },

  legalMoves(state, playerId) {
    if (state.winner || !state.players.includes(playerId)) return [];
    const moves: BingoMove[] = [{ type: 'bingo' }];
    if (state.players[0] === playerId && state.callIndex < state.callOrder.length) moves.push({ type: 'call' });
    const called = new Set(state.callOrder.slice(0, state.callIndex));
    state.cards[playerId]!.forEach((num, cell) => {
      if (cell !== 12 && called.has(num) && !state.marked[playerId]![cell]) moves.push({ type: 'mark', cell });
    });
    return moves;
  },

  applyMove(state, move, playerId): MoveResult<BingoState> {
    if (state.winner) return fail('Game over.');
    if (!state.players.includes(playerId)) return fail('You are not in this game.');
    const next = clone(state);

    if (move.type === 'call') {
      if (next.players[0] !== playerId) return fail('Only the host calls numbers.');
      if (next.callIndex >= next.callOrder.length) return fail('All numbers called.');
      next.callIndex += 1;
      return ok(next);
    }
    if (move.type === 'mark') {
      const num = next.cards[playerId]![move.cell];
      if (num === undefined || move.cell === 12) return fail('Invalid cell.');
      if (!next.callOrder.slice(0, next.callIndex).includes(num)) return fail('That number hasn’t been called.');
      next.marked[playerId]![move.cell] = true;
      return ok(next);
    }
    // bingo claim
    const m = next.marked[playerId]!;
    if (LINES.some((line) => line.every((c) => m[c]))) { next.winner = playerId; return ok(next); }
    return fail('No completed line yet!');
  },

  getResult(state): GameResult | null {
    if (!state.winner) return null;
    return { winnerId: state.winner, draw: false, reason: 'BINGO! 🎉' };
  },
};
