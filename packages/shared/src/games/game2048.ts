import type { GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';
import { nextRng, seedFromOptions } from './rng.js';

// ─────────────────────────────────────────────────────────────
// 2048 — single-player slide-and-merge. Score-based (casual).
// ─────────────────────────────────────────────────────────────

export type Dir = 'up' | 'down' | 'left' | 'right';

export interface Game2048State {
  board: number[]; // 16 cells, 0 = empty
  score: number;
  best: number; // highest tile reached
  rng: number;
  player: string;
  over: boolean;
  won: boolean; // reached 2048
  lastMove: Dir | null;
}

export interface Game2048Move {
  dir: Dir;
}

export const game2048Meta: GameMeta = {
  id: '2048',
  name: '2048',
  category: 'CASUAL',
  minPlayers: 1,
  maxPlayers: 1,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Slide tiles, merge matching numbers, chase 2048.',
  status: 'live',
};

function spawn(board: number[], seed: number): { board: number[]; seed: number } {
  const empties = board.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0);
  if (empties.length === 0) return { board, seed };
  const r1 = nextRng(seed);
  const cell = empties[Math.floor(r1.value * empties.length)]!;
  const r2 = nextRng(r1.seed);
  const next = board.slice();
  next[cell] = r2.value < 0.9 ? 2 : 4;
  return { board: next, seed: r2.seed };
}

/** Slide a line of 4 toward index 0, merging once. */
function slideLine(line: number[]): { line: number[]; gained: number } {
  const nums = line.filter((v) => v !== 0);
  const out: number[] = [];
  let gained = 0;
  for (let i = 0; i < nums.length; i++) {
    if (i + 1 < nums.length && nums[i] === nums[i + 1]) {
      const merged = nums[i]! * 2;
      out.push(merged);
      gained += merged;
      i++;
    } else {
      out.push(nums[i]!);
    }
  }
  while (out.length < 4) out.push(0);
  return { line: out, gained };
}

const lineIndices = (dir: Dir): number[][] => {
  const groups: number[][] = [];
  for (let k = 0; k < 4; k++) {
    const line: number[] = [];
    for (let j = 0; j < 4; j++) {
      // For up/down iterate columns; left/right iterate rows.
      const [r, c] = dir === 'left' || dir === 'right' ? [k, j] : [j, k];
      line.push(r * 4 + c);
    }
    groups.push(dir === 'right' || dir === 'down' ? line.reverse() : line);
  }
  return groups;
};

function canMove(board: number[]): boolean {
  if (board.includes(0)) return true;
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      const v = board[r * 4 + c];
      if (c < 3 && v === board[r * 4 + c + 1]) return true;
      if (r < 3 && v === board[(r + 1) * 4 + c]) return true;
    }
  return false;
}

export const game2048: GameEngine<Game2048State, Game2048Move> = {
  meta: game2048Meta,

  createInitialState(players: PlayerSlot[], options): Game2048State {
    let board = Array(16).fill(0);
    let seed = seedFromOptions(options);
    ({ board, seed } = spawn(board, seed));
    ({ board, seed } = spawn(board, seed));
    return {
      board, score: 0, best: Math.max(...board), rng: seed,
      player: players[0]?.playerId ?? 'seat-0',
      over: false, won: false, lastMove: null,
    };
  },

  currentTurn(state) {
    return state.over ? null : state.player;
  },

  legalMoves(state, playerId) {
    if (state.over || state.player !== playerId) return [];
    return (['up', 'down', 'left', 'right'] as Dir[])
      .filter((dir) => boardAfter(state.board, dir).changed)
      .map((dir) => ({ dir }));
  },

  applyMove(state, move, playerId): MoveResult<Game2048State> {
    if (state.over) return fail('Game is over.');
    if (state.player !== playerId) return fail('Not your board.');
    const result = boardAfter(state.board, move.dir);
    if (!result.changed) return fail('That move changes nothing.');

    const next = clone(state);
    next.score += result.gained;
    next.lastMove = move.dir;
    const spawned = spawn(result.board, next.rng);
    next.board = spawned.board;
    next.rng = spawned.seed;
    next.best = Math.max(...next.board);
    if (next.best >= 2048) next.won = true;
    if (!canMove(next.board)) next.over = true;
    return ok(next);
  },

  getResult(state): GameResult | null {
    if (!state.over) return null;
    return {
      winnerId: state.player,
      draw: false,
      scores: { score: state.score, best: state.best },
      reason: state.won ? `Reached ${state.best} · ${state.score} pts` : `Game over · ${state.score} pts`,
    };
  },
};

/** Apply a direction, returning the resulting board + whether it changed. */
function boardAfter(board: number[], dir: Dir): { board: number[]; changed: boolean; gained: number } {
  const next = board.slice();
  let gained = 0;
  for (const group of lineIndices(dir)) {
    const line = group.map((i) => board[i]!);
    const slid = slideLine(line);
    gained += slid.gained;
    group.forEach((boardIdx, k) => { next[boardIdx] = slid.line[k]!; });
  }
  return { board: next, changed: next.some((v, i) => v !== board[i]), gained };
}
