import type { AIDifficulty, GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';

// ─────────────────────────────────────────────────────────────
// Checkers / Draughts — 8×8, mandatory captures, multi-jumps, kings.
// ─────────────────────────────────────────────────────────────

export type Side = 'RED' | 'BLACK';
export type Cell = 'EMPTY' | 'r' | 'b' | 'R' | 'B'; // lowercase = man, uppercase = king

export interface CheckersState {
  board: Cell[]; // length 64, index = row * 8 + col; pieces only on dark squares
  turn: Side;
  players: Record<Side, string>;
  /** When mid-multi-jump, the square the jumping piece must continue from. */
  mustJumpFrom: number | null;
  winner: Side | null;
  draw: boolean;
  /** Plies since the last capture or promotion; a draw is called at the cap. */
  idlePlies: number;
  lastMove: CheckersMove | null;
}

/** Non-progress plies (no capture/promotion) before the game is a draw. */
export const CHECKERS_IDLE_DRAW = 80;

export interface CheckersMove {
  from: number;
  to: number;
}

export const checkersMeta: GameMeta = {
  id: 'checkers',
  name: 'Checkers',
  category: 'BOARD',
  minPlayers: 2,
  maxPlayers: 2,
  supportsAI: true,
  supportsSpectators: true,
  ranked: true,
  shortDescription: 'Jump, capture, and crown your way to victory.',
  status: 'live',
};

const rc = (i: number) => [Math.floor(i / 8), i % 8] as const;
const idx = (r: number, c: number) => r * 8 + c;
const inB = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;

const isRed = (c: Cell) => c === 'r' || c === 'R';
const isBlack = (c: Cell) => c === 'b' || c === 'B';
const sideOfCell = (c: Cell): Side | null => (isRed(c) ? 'RED' : isBlack(c) ? 'BLACK' : null);
const isKing = (c: Cell) => c === 'R' || c === 'B';

/** Diagonal step directions a piece may use. */
function dirs(cell: Cell): Array<[number, number]> {
  if (isKing(cell)) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  return isRed(cell) ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]; // red moves up, black down
}

function jumpsFrom(board: Cell[], from: number): CheckersMove[] {
  const cell = board[from];
  const side = sideOfCell(cell);
  if (!side) return [];
  const [r, c] = rc(from);
  const moves: CheckersMove[] = [];
  for (const [dr, dc] of dirs(cell)) {
    const mr = r + dr, mc = c + dc;
    const tr = r + 2 * dr, tc = c + 2 * dc;
    if (!inB(tr, tc)) continue;
    const mid = board[idx(mr, mc)];
    if (sideOfCell(mid) && sideOfCell(mid) !== side && board[idx(tr, tc)] === 'EMPTY') {
      moves.push({ from, to: idx(tr, tc) });
    }
  }
  return moves;
}

function simpleMovesFrom(board: Cell[], from: number): CheckersMove[] {
  const cell = board[from];
  if (!sideOfCell(cell)) return [];
  const [r, c] = rc(from);
  const moves: CheckersMove[] = [];
  for (const [dr, dc] of dirs(cell)) {
    const tr = r + dr, tc = c + dc;
    if (inB(tr, tc) && board[idx(tr, tc)] === 'EMPTY') moves.push({ from, to: idx(tr, tc) });
  }
  return moves;
}

function legalFor(state: CheckersState, side: Side): CheckersMove[] {
  if (state.winner || state.draw) return [];
  const { board } = state;
  if (state.mustJumpFrom !== null) return jumpsFrom(board, state.mustJumpFrom);

  const jumps: CheckersMove[] = [];
  const simples: CheckersMove[] = [];
  for (let i = 0; i < 64; i++) {
    if (sideOfCell(board[i]) !== side) continue;
    jumps.push(...jumpsFrom(board, i));
    simples.push(...simpleMovesFrom(board, i));
  }
  return jumps.length > 0 ? jumps : simples; // captures are mandatory
}

const sideOf = (s: CheckersState, pid: string): Side | null =>
  s.players.RED === pid ? 'RED' : s.players.BLACK === pid ? 'BLACK' : null;

export const checkers: GameEngine<CheckersState, CheckersMove> = {
  meta: checkersMeta,

  createInitialState(players: PlayerSlot[]): CheckersState {
    const board: Cell[] = Array(64).fill('EMPTY');
    for (let i = 0; i < 64; i++) {
      const [r, c] = rc(i);
      if ((r + c) % 2 === 0) continue; // only dark squares
      if (r < 3) board[i] = 'b';
      else if (r > 4) board[i] = 'r';
    }
    const red = players.find((p) => p.seat === 0);
    const black = players.find((p) => p.seat === 1);
    return {
      board,
      turn: 'RED', // red (bottom) moves first
      players: { RED: red?.playerId ?? 'seat-0', BLACK: black?.playerId ?? 'seat-1' },
      mustJumpFrom: null,
      winner: null,
      draw: false,
      idlePlies: 0,
      lastMove: null,
    };
  },

  currentTurn(state) {
    if (state.winner || state.draw) return null;
    return state.players[state.turn];
  },

  legalMoves(state, playerId) {
    const side = sideOf(state, playerId);
    if (!side || state.turn !== side) return [];
    return legalFor(state, side);
  },

  applyMove(state, move, playerId): MoveResult<CheckersState> {
    if (state.winner || state.draw) return fail('Game is already over.');
    const side = sideOf(state, playerId);
    if (!side || state.turn !== side) return fail('Not your turn.');
    const legal = legalFor(state, side);
    if (!legal.some((m) => m.from === move.from && m.to === move.to)) return fail('Illegal move.');

    const next = clone(state);
    const piece = next.board[move.from];
    const [fr] = rc(move.from);
    const [tr, tc] = rc(move.to);
    const isJump = Math.abs(tr - fr) === 2;

    next.board[move.from] = 'EMPTY';
    next.board[move.to] = piece;
    if (isJump) {
      const mid = idx((rc(move.from)[0] + tr) / 2, (rc(move.from)[1] + tc) / 2);
      next.board[mid] = 'EMPTY';
    }

    // Promotion (ends the move even mid-jump, per standard rules).
    let promoted = false;
    if (piece === 'r' && tr === 0) { next.board[move.to] = 'R'; promoted = true; }
    if (piece === 'b' && tr === 7) { next.board[move.to] = 'B'; promoted = true; }

    next.lastMove = move;
    next.idlePlies = isJump || promoted ? 0 : next.idlePlies + 1;

    if (isJump && !promoted && jumpsFrom(next.board, move.to).length > 0) {
      next.mustJumpFrom = move.to; // same player keeps jumping
    } else {
      next.mustJumpFrom = null;
      next.turn = side === 'RED' ? 'BLACK' : 'RED';
      if (legalFor(next, next.turn).length === 0) {
        next.winner = side; // opponent can't move
      } else if (next.idlePlies >= CHECKERS_IDLE_DRAW) {
        next.draw = true; // no progress for too long
      }
    }
    return ok(next);
  },

  getResult(state): GameResult | null {
    if (state.draw) return { winnerId: null, draw: true, reason: 'Draw — no progress' };
    if (!state.winner) return null;
    return { winnerId: state.players[state.winner], draw: false, reason: 'Opponent has no moves' };
  },

  aiMove(state, playerId, difficulty: AIDifficulty): CheckersMove | null {
    const side = sideOf(state, playerId);
    if (!side || state.turn !== side) return null;
    const moves = legalFor(state, side);
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];

    const depth = difficulty === 'hard' ? 6 : difficulty === 'medium' ? 4 : 2;
    let best = moves[0];
    let bestScore = -Infinity;
    for (const m of moves) {
      const res = this.applyMove(state, m, playerId);
      if (!res.ok) continue;
      const score = search(res.state, depth - 1, -Infinity, Infinity, res.state.turn, side);
      if (score > bestScore) { bestScore = score; best = m; }
    }
    return best;
  },
};

function evaluate(state: CheckersState, root: Side): number {
  let score = 0;
  for (let i = 0; i < 64; i++) {
    const cell = state.board[i];
    const s = sideOfCell(cell);
    if (!s) continue;
    const [r] = rc(i);
    let v = isKing(cell) ? 18 : 10;
    if (!isKing(cell)) v += s === 'RED' ? (7 - r) : r; // reward advancement
    score += s === root ? v : -v;
  }
  return score;
}

/** Minimax with alpha-beta, scored from `root`'s perspective throughout. */
function search(state: CheckersState, depth: number, alpha: number, beta: number, toMove: Side, root: Side): number {
  if (state.winner) return state.winner === root ? 100000 : -100000;
  if (state.draw) return 0;
  if (depth <= 0) return evaluate(state, root);

  const moves = legalFor(state, toMove);
  if (moves.length === 0) return toMove === root ? -100000 : 100000; // toMove is stuck → loses

  const playerId = state.players[toMove];
  const maximizing = toMove === root;
  let best = maximizing ? -Infinity : Infinity;
  for (const m of moves) {
    const res = checkers.applyMove(state, m, playerId);
    if (!res.ok) continue;
    // The same side may keep the turn during a multi-jump.
    const score = search(res.state, depth - 1, alpha, beta, res.state.turn, root);
    if (maximizing) {
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, score);
      beta = Math.min(beta, best);
    }
    if (alpha >= beta) break;
  }
  return best;
}
