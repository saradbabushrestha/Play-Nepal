import type { AIDifficulty, GameMeta, GameResult, PlayerSlot } from '../types.js';
import { fail, ok, type GameEngine, type MoveResult } from './engine.js';

// ─────────────────────────────────────────────────────────────
// Chess — full legal-move rules (castling, en passant, promotion,
// check / checkmate / stalemate, 50-move) + alpha-beta AI.
// Board index 0 = a8 (top-left), 63 = h1. White starts at the bottom.
// ─────────────────────────────────────────────────────────────

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type Color = 'w' | 'b';
export interface Piece { t: PieceType; c: Color }
export type Cell = Piece | null;

export interface Castling { wk: boolean; wq: boolean; bk: boolean; bq: boolean }

export interface ChessState {
  board: Cell[]; // 64
  turn: Color;
  players: Record<Color, string>;
  castling: Castling;
  enPassant: number | null;
  halfmove: number;
  winner: Color | null;
  draw: boolean;
  check: boolean;
  lastMove: { from: number; to: number } | null;
  reason: string | null;
}

export interface ChessMove {
  from: number;
  to: number;
  promotion?: 'q' | 'r' | 'b' | 'n';
}

export const chessMeta: GameMeta = {
  id: 'chess',
  name: 'Chess',
  category: 'BOARD',
  minPlayers: 2,
  maxPlayers: 2,
  supportsAI: true,
  supportsSpectators: true,
  ranked: true,
  shortDescription: 'The timeless game of kings — full rules with an AI opponent.',
  status: 'live',
};

const fileOf = (i: number) => i % 8;
const rankOf = (i: number) => Math.floor(i / 8);
const KNIGHT: Array<[number, number]> = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KING8: Array<[number, number]> = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const DIAG: Array<[number, number]> = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ORTHO: Array<[number, number]> = [[-1, 0], [1, 0], [0, -1], [0, 1]];

function startBoard(): Cell[] {
  const b: Cell[] = Array(64).fill(null);
  const back: PieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  for (let f = 0; f < 8; f++) {
    b[f] = { t: back[f]!, c: 'b' };
    b[8 + f] = { t: 'p', c: 'b' };
    b[48 + f] = { t: 'p', c: 'w' };
    b[56 + f] = { t: back[f]!, c: 'w' };
  }
  return b;
}

function findKing(board: Cell[], c: Color): number {
  for (let i = 0; i < 64; i++) { const p = board[i]; if (p && p.t === 'k' && p.c === c) return i; }
  return -1;
}

export function isAttacked(board: Cell[], sq: number, by: Color): boolean {
  const sr = rankOf(sq), sf = fileOf(sq);
  const pr = by === 'w' ? sr + 1 : sr - 1;
  for (const pf of [sf - 1, sf + 1]) {
    if (pf >= 0 && pf < 8 && pr >= 0 && pr < 8) {
      const pc = board[pr * 8 + pf];
      if (pc && pc.c === by && pc.t === 'p') return true;
    }
  }
  for (const [dr, dc] of KNIGHT) {
    const r = sr + dr, c = sf + dc;
    if (r >= 0 && r < 8 && c >= 0 && c < 8) { const pc = board[r * 8 + c]; if (pc && pc.c === by && pc.t === 'n') return true; }
  }
  for (const [dr, dc] of KING8) {
    const r = sr + dr, c = sf + dc;
    if (r >= 0 && r < 8 && c >= 0 && c < 8) { const pc = board[r * 8 + c]; if (pc && pc.c === by && pc.t === 'k') return true; }
  }
  for (const [dr, dc] of DIAG) {
    let r = sr + dr, c = sf + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) { const pc = board[r * 8 + c]; if (pc) { if (pc.c === by && (pc.t === 'b' || pc.t === 'q')) return true; break; } r += dr; c += dc; }
  }
  for (const [dr, dc] of ORTHO) {
    let r = sr + dr, c = sf + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) { const pc = board[r * 8 + c]; if (pc) { if (pc.c === by && (pc.t === 'r' || pc.t === 'q')) return true; break; } r += dr; c += dc; }
  }
  return false;
}

function inCheck(board: Cell[], c: Color): boolean {
  const k = findKing(board, c);
  return k >= 0 && isAttacked(board, k, c === 'w' ? 'b' : 'w');
}

/** Fast, shallow clone. Piece objects are immutable (never mutated in place),
 *  so the board array can share piece references — far cheaper than a deep
 *  structuredClone, which matters for the thousands of nodes the AI searches. */
function fastClone(state: ChessState): ChessState {
  return {
    board: state.board.slice(),
    turn: state.turn,
    players: state.players,
    castling: { ...state.castling },
    enPassant: state.enPassant,
    halfmove: state.halfmove,
    winner: state.winner,
    draw: state.draw,
    check: state.check,
    lastMove: state.lastMove,
    reason: state.reason,
  };
}

/** Apply a fully-formed move to a board copy (no legality checks). */
function makeMove(state: ChessState, m: ChessMove): ChessState {
  const next = fastClone(state);
  const b = next.board;
  const piece = b[m.from]!;
  const color = piece.c;
  next.enPassant = null;

  // En passant capture
  if (piece.t === 'p' && m.to === state.enPassant && b[m.to] === null) {
    const capSq = color === 'w' ? m.to + 8 : m.to - 8;
    b[capSq] = null;
  }
  // Castling rook move
  if (piece.t === 'k' && Math.abs(fileOf(m.to) - fileOf(m.from)) === 2) {
    if (m.to === m.from + 2) { b[m.from + 1] = b[m.from + 3]; b[m.from + 3] = null; } // kingside
    else { b[m.from - 1] = b[m.from - 4]; b[m.from - 4] = null; } // queenside
  }

  const captured = b[m.to];
  b[m.to] = piece;
  b[m.from] = null;

  // Promotion
  if (piece.t === 'p' && (rankOf(m.to) === 0 || rankOf(m.to) === 7)) {
    b[m.to] = { t: m.promotion ?? 'q', c: color };
  }
  // Double pawn push → en passant target
  if (piece.t === 'p' && Math.abs(rankOf(m.to) - rankOf(m.from)) === 2) {
    next.enPassant = (m.from + m.to) / 2;
  }

  // Castling rights
  if (piece.t === 'k') { if (color === 'w') { next.castling.wk = false; next.castling.wq = false; } else { next.castling.bk = false; next.castling.bq = false; } }
  const touch = (sq: number) => {
    if (sq === 63) next.castling.wk = false; if (sq === 56) next.castling.wq = false;
    if (sq === 7) next.castling.bk = false; if (sq === 0) next.castling.bq = false;
  };
  touch(m.from); touch(m.to);

  next.halfmove = piece.t === 'p' || captured ? 0 : next.halfmove + 1;
  next.turn = color === 'w' ? 'b' : 'w';
  next.lastMove = { from: m.from, to: m.to };
  return next;
}

/** Pseudo-legal moves for `color` (ignores leaving own king in check). */
function pseudoMoves(state: ChessState, color: Color): ChessMove[] {
  const b = state.board;
  const moves: ChessMove[] = [];
  const add = (from: number, to: number) => {
    if (b[from]!.t === 'p' && (rankOf(to) === 0 || rankOf(to) === 7)) {
      for (const pr of ['q', 'r', 'b', 'n'] as const) moves.push({ from, to, promotion: pr });
    } else moves.push({ from, to });
  };

  for (let i = 0; i < 64; i++) {
    const p = b[i];
    if (!p || p.c !== color) continue;
    const r = rankOf(i), f = fileOf(i);

    if (p.t === 'p') {
      const dir = color === 'w' ? -1 : 1;
      const startRank = color === 'w' ? 6 : 1;
      const one = i + dir * 8;
      if (one >= 0 && one < 64 && b[one] === null) {
        add(i, one);
        const two = i + dir * 16;
        if (r === startRank && b[two] === null) add(i, two);
      }
      for (const df of [-1, 1]) {
        const nf = f + df, nr = r + dir;
        if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
        const to = nr * 8 + nf;
        const target = b[to];
        if ((target && target.c !== color) || to === state.enPassant) add(i, to);
      }
    } else if (p.t === 'n') {
      for (const [dr, dc] of KNIGHT) {
        const nr = r + dr, nc = f + dc;
        if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
        const to = nr * 8 + nc;
        if (!b[to] || b[to]!.c !== color) moves.push({ from: i, to });
      }
    } else if (p.t === 'k') {
      for (const [dr, dc] of KING8) {
        const nr = r + dr, nc = f + dc;
        if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
        const to = nr * 8 + nc;
        if (!b[to] || b[to]!.c !== color) moves.push({ from: i, to });
      }
      // Castling
      const enemy = color === 'w' ? 'b' : 'w';
      const rights = state.castling;
      const homeK = color === 'w' ? 60 : 4;
      if (i === homeK && !isAttacked(b, i, enemy)) {
        const ks = color === 'w' ? rights.wk : rights.bk;
        const qs = color === 'w' ? rights.wq : rights.bq;
        if (ks && !b[i + 1] && !b[i + 2] && b[i + 3]?.t === 'r' && !isAttacked(b, i + 1, enemy) && !isAttacked(b, i + 2, enemy)) moves.push({ from: i, to: i + 2 });
        if (qs && !b[i - 1] && !b[i - 2] && !b[i - 3] && b[i - 4]?.t === 'r' && !isAttacked(b, i - 1, enemy) && !isAttacked(b, i - 2, enemy)) moves.push({ from: i, to: i - 2 });
      }
    } else {
      const dirs = p.t === 'b' ? DIAG : p.t === 'r' ? ORTHO : [...DIAG, ...ORTHO];
      for (const [dr, dc] of dirs) {
        let nr = r + dr, nc = f + dc;
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const to = nr * 8 + nc;
          if (!b[to]) moves.push({ from: i, to });
          else { if (b[to]!.c !== color) moves.push({ from: i, to }); break; }
          nr += dr; nc += dc;
        }
      }
    }
  }
  return moves;
}

function legalFor(state: ChessState, color: Color): ChessMove[] {
  return pseudoMoves(state, color).filter((m) => !inCheck(makeMove(state, m).board, color));
}

const sideOf = (s: ChessState, pid: string): Color | null =>
  s.players.w === pid ? 'w' : s.players.b === pid ? 'b' : null;

function settle(next: ChessState): void {
  const moves = legalFor(next, next.turn);
  next.check = inCheck(next.board, next.turn);
  if (moves.length === 0) {
    if (next.check) { next.winner = next.turn === 'w' ? 'b' : 'w'; next.reason = 'Checkmate'; }
    else { next.draw = true; next.reason = 'Stalemate'; }
  } else if (next.halfmove >= 100) {
    next.draw = true; next.reason = 'Fifty-move rule';
  }
}

export const chess: GameEngine<ChessState, ChessMove> = {
  meta: chessMeta,

  createInitialState(players: PlayerSlot[]): ChessState {
    const w = players.find((p) => p.seat === 0);
    const b = players.find((p) => p.seat === 1);
    return {
      board: startBoard(),
      turn: 'w',
      players: { w: w?.playerId ?? 'seat-0', b: b?.playerId ?? 'seat-1' },
      castling: { wk: true, wq: true, bk: true, bq: true },
      enPassant: null,
      halfmove: 0,
      winner: null,
      draw: false,
      check: false,
      lastMove: null,
      reason: null,
    };
  },

  currentTurn(state) {
    if (state.winner || state.draw) return null;
    return state.players[state.turn];
  },

  legalMoves(state, playerId) {
    const c = sideOf(state, playerId);
    if (!c || state.turn !== c || state.winner || state.draw) return [];
    return legalFor(state, c);
  },

  applyMove(state, move, playerId): MoveResult<ChessState> {
    if (state.winner || state.draw) return fail('Game is over.');
    const c = sideOf(state, playerId);
    if (!c || state.turn !== c) return fail('Not your turn.');
    const legal = legalFor(state, c);
    const chosen = legal.find((m) => m.from === move.from && m.to === move.to && (m.promotion ?? 'q') === (move.promotion ?? 'q'));
    if (!chosen) return fail('Illegal move.');
    const next = makeMove(state, chosen);
    settle(next);
    return ok(next);
  },

  getResult(state): GameResult | null {
    if (state.winner) return { winnerId: state.players[state.winner], draw: false, reason: state.reason ?? 'Checkmate' };
    if (state.draw) return { winnerId: null, draw: true, reason: state.reason ?? 'Draw' };
    return null;
  },

  aiMove(state, playerId, difficulty: AIDifficulty): ChessMove | null {
    const c = sideOf(state, playerId);
    if (!c || state.turn !== c) return null;
    const moves = orderMoves(state, legalFor(state, c));
    if (moves.length === 0) return null;
    const depth = difficulty === 'hard' ? 4 : difficulty === 'medium' ? 3 : 2;

    let best = moves[0]!;
    let bestScore = -Infinity;
    for (const m of moves) {
      const score = -search(makeMove(state, m), depth - 1, -Infinity, Infinity, c === 'w' ? 'b' : 'w');
      if (score > bestScore) { bestScore = score; best = m; }
    }
    return best;
  },
};

// ── AI evaluation ──
const VAL: Record<PieceType, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
const PST_PAWN = [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0];
const PST_KNIGHT = [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50];
const PST_BISHOP = [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20];
const PST_KING = [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20];
const pstFor = (t: PieceType) => t === 'p' ? PST_PAWN : t === 'n' ? PST_KNIGHT : t === 'b' ? PST_BISHOP : t === 'k' ? PST_KING : null;

/** Static evaluation from `side`'s perspective. */
function evaluate(state: ChessState, side: Color): number {
  let score = 0;
  for (let i = 0; i < 64; i++) {
    const p = state.board[i];
    if (!p) continue;
    const pst = pstFor(p.t);
    const positional = pst ? (p.c === 'w' ? pst[i]! : pst[63 - i]!) : 0;
    const v = VAL[p.t] + positional;
    score += p.c === side ? v : -v;
  }
  return score;
}

function orderMoves(state: ChessState, moves: ChessMove[]): ChessMove[] {
  return [...moves].sort((a, b) => captureValue(state, b) - captureValue(state, a));
}
function captureValue(state: ChessState, m: ChessMove): number {
  const victim = state.board[m.to];
  return victim ? VAL[victim.t] : 0;
}

/** Negamax with alpha-beta; returns the score from `toMove`'s perspective. */
function search(state: ChessState, depth: number, alpha: number, beta: number, toMove: Color): number {
  const moves = legalFor(state, toMove);
  if (moves.length === 0) {
    return inCheck(state.board, toMove) ? -(100000 + depth) : 0; // checkmate vs stalemate
  }
  if (depth <= 0) return evaluate(state, toMove);

  let best = -Infinity;
  for (const m of orderMoves(state, moves)) {
    const score = -search(makeMove(state, m), depth - 1, -beta, -alpha, toMove === 'w' ? 'b' : 'w');
    best = Math.max(best, score);
    alpha = Math.max(alpha, score);
    if (alpha >= beta) break;
  }
  return best;
}
