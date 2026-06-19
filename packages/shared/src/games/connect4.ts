import type { AIDifficulty, GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';

export type Disc = 'R' | 'Y';
export type Cell = Disc | null;

export const COLS = 7;
export const ROWS = 6;

export interface Connect4State {
  /** length 42, index = row * COLS + col, row 0 = top. */
  board: Cell[];
  turn: Disc;
  players: Record<Disc, string>;
  winner: Disc | null;
  winningCells: number[] | null;
  draw: boolean;
}

export interface Connect4Move {
  col: number; // 0..6
}

export const connect4Meta: GameMeta = {
  id: 'connect-4',
  name: 'Connect 4',
  category: 'BOARD',
  minPlayers: 2,
  maxPlayers: 2,
  supportsAI: true,
  supportsSpectators: true,
  ranked: true,
  shortDescription: 'Drop discs and line up four before your rival.',
  status: 'live',
};

const idx = (r: number, c: number) => r * COLS + c;

/** Lowest empty row in a column, or -1 if full. */
function dropRow(board: Cell[], col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[idx(r, col)] === null) return r;
  }
  return -1;
}

const DIRECTIONS = [
  [0, 1],  // horizontal
  [1, 0],  // vertical
  [1, 1],  // diagonal ↘
  [1, -1], // diagonal ↙
];

function findWin(board: Cell[], lastRow: number, lastCol: number, disc: Disc): number[] | null {
  for (const [dr, dc] of DIRECTIONS) {
    const cells = [idx(lastRow, lastCol)];
    for (const sign of [-1, 1]) {
      let r = lastRow + dr * sign;
      let c = lastCol + dc * sign;
      while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[idx(r, c)] === disc) {
        cells.push(idx(r, c));
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (cells.length >= 4) return cells.sort((a, b) => a - b);
  }
  return null;
}

export const connect4: GameEngine<Connect4State, Connect4Move> = {
  meta: connect4Meta,

  createInitialState(players: PlayerSlot[]): Connect4State {
    const r = players.find((p) => p.seat === 0);
    const y = players.find((p) => p.seat === 1);
    return {
      board: Array(ROWS * COLS).fill(null),
      turn: 'R',
      players: { R: r?.playerId ?? 'seat-0', Y: y?.playerId ?? 'seat-1' },
      winner: null,
      winningCells: null,
      draw: false,
    };
  },

  currentTurn(state) {
    if (state.winner || state.draw) return null;
    return state.players[state.turn];
  },

  legalMoves(state, playerId) {
    if (this.currentTurn(state) !== playerId) return [];
    const moves: Connect4Move[] = [];
    for (let c = 0; c < COLS; c++) {
      if (dropRow(state.board, c) !== -1) moves.push({ col: c });
    }
    return moves;
  },

  applyMove(state, move, playerId): MoveResult<Connect4State> {
    if (state.winner || state.draw) return fail('Game is already over.');
    if (this.currentTurn(state) !== playerId) return fail('Not your turn.');
    if (move.col < 0 || move.col >= COLS) return fail('Column out of range.');
    const row = dropRow(state.board, move.col);
    if (row === -1) return fail('Column is full.');

    const next = clone(state);
    next.board[idx(row, move.col)] = next.turn;

    const win = findWin(next.board, row, move.col, next.turn);
    if (win) {
      next.winner = next.turn;
      next.winningCells = win;
    } else if (next.board.every((c) => c !== null)) {
      next.draw = true;
    } else {
      next.turn = next.turn === 'R' ? 'Y' : 'R';
    }
    return ok(next);
  },

  getResult(state): GameResult | null {
    if (state.winner) return { winnerId: state.players[state.winner], draw: false, reason: 'Four in a row' };
    if (state.draw) return { winnerId: null, draw: true, reason: 'Board full' };
    return null;
  },

  aiMove(state, playerId, difficulty: AIDifficulty): Connect4Move | null {
    const moves = this.legalMoves(state, playerId);
    if (moves.length === 0) return null;
    const depth = difficulty === 'hard' ? 7 : difficulty === 'medium' ? 5 : 2;
    const me = state.turn;

    let best = moves[0];
    let bestScore = -Infinity;
    // Prefer centre columns first — improves alpha-beta pruning + play strength.
    const ordered = [...moves].sort((a, b) => Math.abs(3 - a.col) - Math.abs(3 - b.col));
    for (const m of ordered) {
      const row = dropRow(state.board, m.col);
      const board = state.board.slice();
      board[idx(row, m.col)] = me;
      const score = -negamax(board, me === 'R' ? 'Y' : 'R', me, depth - 1, -Infinity, Infinity, row, m.col);
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }
    return best;
  },
};

/** Alpha-beta negamax. Score is from `root`'s perspective. */
function negamax(
  board: Cell[],
  toMove: Disc,
  root: Disc,
  depth: number,
  alpha: number,
  beta: number,
  lastRow: number,
  lastCol: number,
): number {
  const mover = toMove === 'R' ? 'Y' : 'R'; // who just moved
  if (findWin(board, lastRow, lastCol, mover)) {
    // The player who just moved won. If that's root, good (from this node's
    // mover perspective it's a loss → negative, flipped by caller's negate).
    return mover === root ? -100000 - depth : 100000 + depth;
  }
  if (board.every((c) => c !== null) || depth === 0) {
    return heuristic(board, toMove);
  }

  let best = -Infinity;
  const cols = [3, 2, 4, 1, 5, 0, 6];
  for (const col of cols) {
    const row = dropRow(board, col);
    if (row === -1) continue;
    board[idx(row, col)] = toMove;
    const score = -negamax(board, toMove === 'R' ? 'Y' : 'R', root, depth - 1, -beta, -alpha, row, col);
    board[idx(row, col)] = null;
    best = Math.max(best, score);
    alpha = Math.max(alpha, score);
    if (alpha >= beta) break;
  }
  return best;
}

/** Window-based positional heuristic from `toMove`'s perspective. */
function heuristic(board: Cell[], toMove: Disc): number {
  const me = toMove;
  const opp: Disc = toMove === 'R' ? 'Y' : 'R';
  let score = 0;

  // Centre control.
  for (let r = 0; r < ROWS; r++) {
    if (board[idx(r, 3)] === me) score += 3;
    else if (board[idx(r, 3)] === opp) score -= 3;
  }

  const scoreWindow = (cells: Cell[]): number => {
    const mine = cells.filter((c) => c === me).length;
    const theirs = cells.filter((c) => c === opp).length;
    if (mine > 0 && theirs > 0) return 0;
    if (mine === 3) return 50;
    if (mine === 2) return 10;
    if (theirs === 3) return -60;
    if (theirs === 2) return -10;
    return 0;
  };

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      for (const [dr, dc] of DIRECTIONS) {
        const er = r + dr * 3;
        const ec = c + dc * 3;
        if (er < 0 || er >= ROWS || ec < 0 || ec >= COLS) continue;
        const window: Cell[] = [];
        for (let k = 0; k < 4; k++) window.push(board[idx(r + dr * k, c + dc * k)]);
        score += scoreWindow(window);
      }
    }
  }
  return score;
}
