import type { GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';
import { seedFromOptions, shuffle } from './rng.js';

// ─────────────────────────────────────────────────────────────
// Sudoku — single-player. Seeded generator from a transformed base
// grid (guaranteed-valid solution), then cells are removed.
// ─────────────────────────────────────────────────────────────

export interface SudokuState {
  puzzle: number[];   // 81, 0 = blank clue cell
  current: number[];  // player's working grid
  solution: number[];
  fixed: boolean[];   // clue cells (immutable)
  status: 'playing' | 'won';
  player: string;
}

export interface SudokuMove {
  index: number;
  value: number; // 0 clears
}

export const sudokuMeta: GameMeta = {
  id: 'sudoku',
  name: 'Sudoku',
  category: 'CASUAL',
  minPlayers: 1,
  maxPlayers: 1,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Fill the 9×9 grid so every row, column and box has 1–9.',
  status: 'live',
};

const BLANKS = 48; // cells removed

function generateSolution(seed: number): { grid: number[]; seed: number } {
  let s = seed;
  const pat = (r: number, c: number) => (3 * (r % 3) + Math.floor(r / 3) + c) % 9;
  const shuf = <T,>(arr: T[]) => { const res = shuffle(arr, s); s = res.seed; return res.result; };
  const bands = shuf([0, 1, 2]);
  const rows = bands.flatMap((b) => shuf([0, 1, 2]).map((r) => b * 3 + r));
  const stacks = shuf([0, 1, 2]);
  const cols = stacks.flatMap((b) => shuf([0, 1, 2]).map((c) => b * 3 + c));
  const nums = shuf([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const grid: number[] = Array(81).fill(0);
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      grid[r * 9 + c] = nums[pat(rows[r]!, cols[c]!)]!;
  return { grid, seed: s };
}

export const sudoku: GameEngine<SudokuState, SudokuMove> = {
  meta: sudokuMeta,

  createInitialState(players: PlayerSlot[], options): SudokuState {
    const { grid: solution, seed } = generateSolution(seedFromOptions(options));
    const order = shuffle(Array.from({ length: 81 }, (_, i) => i), seed).result;
    const puzzle = solution.slice();
    for (let k = 0; k < BLANKS; k++) puzzle[order[k]!] = 0;
    return {
      puzzle,
      current: puzzle.slice(),
      solution,
      fixed: puzzle.map((v) => v !== 0),
      status: 'playing',
      player: players[0]?.playerId ?? 'seat-0',
    };
  },

  currentTurn(state) { return state.status === 'playing' ? state.player : null; },

  legalMoves(state, playerId) {
    if (state.status !== 'playing' || state.player !== playerId) return [];
    const moves: SudokuMove[] = [];
    state.current.forEach((_, i) => { if (!state.fixed[i]) for (let v = 0; v <= 9; v++) moves.push({ index: i, value: v }); });
    return moves;
  },

  applyMove(state, move, playerId): MoveResult<SudokuState> {
    if (state.status !== 'playing') return fail('Puzzle solved.');
    if (state.player !== playerId) return fail('Not your puzzle.');
    if (move.index < 0 || move.index >= 81) return fail('Out of range.');
    if (state.fixed[move.index]) return fail('That cell is a given clue.');
    if (move.value < 0 || move.value > 9) return fail('Value must be 0–9.');

    const next = clone(state);
    next.current[move.index] = move.value;
    if (next.current.every((v, i) => v === next.solution[i])) next.status = 'won';
    return ok(next);
  },

  getResult(state): GameResult | null {
    if (state.status !== 'won') return null;
    return { winnerId: state.player, draw: false, reason: 'Solved!' };
  },
};
