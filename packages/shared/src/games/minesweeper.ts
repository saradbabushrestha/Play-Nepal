import type { GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';
import { seedFromOptions, shuffle } from './rng.js';

// ─────────────────────────────────────────────────────────────
// Minesweeper — single-player, first-click-safe, flood reveal.
// ─────────────────────────────────────────────────────────────

export const MS_W = 9;
export const MS_H = 9;
export const MS_MINES = 10;

export interface MinesweeperState {
  width: number;
  height: number;
  mineCount: number;
  mines: number[];        // indices (empty until first reveal)
  counts: number[];       // adjacent mine counts
  revealed: boolean[];
  flagged: boolean[];
  started: boolean;
  status: 'playing' | 'won' | 'lost';
  exploded: number | null;
  rng: number;
  player: string;
}

export interface MinesweeperMove {
  type: 'reveal' | 'flag';
  index: number;
}

export const minesweeperMeta: GameMeta = {
  id: 'minesweeper',
  name: 'Minesweeper',
  category: 'CASUAL',
  minPlayers: 1,
  maxPlayers: 1,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Clear the field without detonating a mine.',
  status: 'live',
};

const neighbors = (i: number, w: number, h: number): number[] => {
  const r = Math.floor(i / w), c = i % w;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < h && nc >= 0 && nc < w) out.push(nr * w + nc);
    }
  return out;
};

function placeMines(state: MinesweeperState, safe: number): void {
  const banned = new Set([safe, ...neighbors(safe, state.width, state.height)]);
  const pool = Array.from({ length: state.width * state.height }, (_, i) => i).filter((i) => !banned.has(i));
  const { result } = shuffle(pool, state.rng);
  state.mines = result.slice(0, state.mineCount);
  const mineSet = new Set(state.mines);
  state.counts = state.counts.map((_, i) => (mineSet.has(i) ? -1 : neighbors(i, state.width, state.height).filter((n) => mineSet.has(n)).length));
  state.started = true;
}

function flood(state: MinesweeperState, start: number): void {
  const stack = [start];
  while (stack.length) {
    const i = stack.pop()!;
    if (state.revealed[i] || state.flagged[i]) continue;
    state.revealed[i] = true;
    if (state.counts[i] === 0) for (const n of neighbors(i, state.width, state.height)) if (!state.revealed[n]) stack.push(n);
  }
}

export const minesweeper: GameEngine<MinesweeperState, MinesweeperMove> = {
  meta: minesweeperMeta,

  createInitialState(players: PlayerSlot[], options): MinesweeperState {
    const size = MS_W * MS_H;
    return {
      width: MS_W, height: MS_H, mineCount: MS_MINES,
      mines: [], counts: Array(size).fill(0),
      revealed: Array(size).fill(false), flagged: Array(size).fill(false),
      started: false, status: 'playing', exploded: null,
      rng: seedFromOptions(options), player: players[0]?.playerId ?? 'seat-0',
    };
  },

  currentTurn(state) { return state.status === 'playing' ? state.player : null; },

  legalMoves(state, playerId) {
    if (state.status !== 'playing' || state.player !== playerId) return [];
    const moves: MinesweeperMove[] = [];
    state.revealed.forEach((rev, i) => {
      if (!rev) { moves.push({ type: 'reveal', index: i }); moves.push({ type: 'flag', index: i }); }
    });
    return moves;
  },

  applyMove(state, move, playerId): MoveResult<MinesweeperState> {
    if (state.status !== 'playing') return fail('Game is over.');
    if (state.player !== playerId) return fail('Not your board.');
    if (move.index < 0 || move.index >= state.width * state.height) return fail('Out of range.');
    const next = clone(state);

    if (move.type === 'flag') {
      if (!next.revealed[move.index]) next.flagged[move.index] = !next.flagged[move.index];
      return ok(next);
    }
    // reveal
    if (next.revealed[move.index] || next.flagged[move.index]) return fail('Cannot reveal that cell.');
    if (!next.started) placeMines(next, move.index);

    if (next.counts[move.index] === -1) {
      next.status = 'lost';
      next.exploded = move.index;
      next.mines.forEach((m) => { next.revealed[m] = true; });
      return ok(next);
    }
    flood(next, move.index);
    const safeCells = next.width * next.height - next.mineCount;
    if (next.revealed.filter(Boolean).length >= safeCells) next.status = 'won';
    return ok(next);
  },

  getResult(state): GameResult | null {
    if (state.status === 'playing') return null;
    if (state.status === 'won') return { winnerId: state.player, draw: false, reason: 'Field cleared!' };
    return { winnerId: null, draw: false, reason: 'Boom! 💥' };
  },
};
