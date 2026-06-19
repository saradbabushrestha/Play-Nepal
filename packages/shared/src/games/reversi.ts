import type { AIDifficulty, GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';

// ─────────────────────────────────────────────────────────────
// Reversi / Othello — flank and flip on an 8×8 board.
// ─────────────────────────────────────────────────────────────

export type Disc = 'B' | 'W';
export type Cell = Disc | 'EMPTY';

export interface ReversiState {
  board: Cell[]; // length 64
  turn: Disc;
  players: Record<Disc, string>;
  winner: Disc | null;
  draw: boolean;
  lastMove: number | null;
}

export interface ReversiMove {
  index: number;
}

export const reversiMeta: GameMeta = {
  id: 'reversi',
  name: 'Reversi',
  category: 'BOARD',
  minPlayers: 2,
  maxPlayers: 2,
  supportsAI: true,
  supportsSpectators: true,
  ranked: true,
  shortDescription: 'Outflank your rival to flip the board your colour.',
  status: 'live',
};

const DIRS = [-9, -8, -7, -1, 1, 7, 8, 9];
const rc = (i: number) => [Math.floor(i / 8), i % 8] as const;
const opp = (d: Disc): Disc => (d === 'B' ? 'W' : 'B');

/** Discs that would flip if `disc` plays at `i`, or [] if illegal. */
function flips(board: Cell[], i: number, disc: Disc): number[] {
  if (board[i] !== 'EMPTY') return [];
  const out: number[] = [];
  for (const d of DIRS) {
    const line: number[] = [];
    let j = i + d;
    let [pr, pc] = rc(i);
    while (j >= 0 && j < 64) {
      const [jr, jc] = rc(j);
      if (Math.abs(jr - pr) > 1 || Math.abs(jc - pc) > 1) break; // wrapped edge
      if (board[j] === 'EMPTY') break;
      if (board[j] === disc) { out.push(...line); break; }
      line.push(j);
      pr = jr; pc = jc;
      j += d;
    }
  }
  return out;
}

function legalIndices(board: Cell[], disc: Disc): number[] {
  const out: number[] = [];
  for (let i = 0; i < 64; i++) if (flips(board, i, disc).length > 0) out.push(i);
  return out;
}

const sideOf = (s: ReversiState, pid: string): Disc | null =>
  s.players.B === pid ? 'B' : s.players.W === pid ? 'W' : null;

function settle(state: ReversiState): void {
  const b = state.board.filter((c) => c === 'B').length;
  const w = state.board.filter((c) => c === 'W').length;
  if (b === w) state.draw = true;
  else state.winner = b > w ? 'B' : 'W';
}

export const reversi: GameEngine<ReversiState, ReversiMove> = {
  meta: reversiMeta,

  createInitialState(players: PlayerSlot[]): ReversiState {
    const board: Cell[] = Array(64).fill('EMPTY');
    board[27] = 'W'; board[28] = 'B'; board[35] = 'B'; board[36] = 'W';
    const black = players.find((p) => p.seat === 0);
    const white = players.find((p) => p.seat === 1);
    return {
      board,
      turn: 'B', // black moves first
      players: { B: black?.playerId ?? 'seat-0', W: white?.playerId ?? 'seat-1' },
      winner: null,
      draw: false,
      lastMove: null,
    };
  },

  currentTurn(state) {
    if (state.winner || state.draw) return null;
    return state.players[state.turn];
  },

  legalMoves(state, playerId) {
    const side = sideOf(state, playerId);
    if (!side || state.turn !== side || state.winner || state.draw) return [];
    return legalIndices(state.board, side).map((index) => ({ index }));
  },

  applyMove(state, move, playerId): MoveResult<ReversiState> {
    if (state.winner || state.draw) return fail('Game is already over.');
    const side = sideOf(state, playerId);
    if (!side || state.turn !== side) return fail('Not your turn.');
    const flipped = flips(state.board, move.index, side);
    if (flipped.length === 0) return fail('Illegal move — must flank a disc.');

    const next = clone(state);
    next.board[move.index] = side;
    for (const f of flipped) next.board[f] = side;
    next.lastMove = move.index;

    // Decide who moves next (handling passes and game end).
    const other = opp(side);
    if (legalIndices(next.board, other).length > 0) {
      next.turn = other;
    } else if (legalIndices(next.board, side).length > 0) {
      next.turn = side; // opponent passes
    } else {
      settle(next); // neither can move
    }
    return ok(next);
  },

  getResult(state): GameResult | null {
    const b = state.board.filter((c) => c === 'B').length;
    const w = state.board.filter((c) => c === 'W').length;
    if (state.draw) return { winnerId: null, draw: true, scores: { B: b, W: w }, reason: 'Equal discs' };
    if (state.winner) return { winnerId: state.players[state.winner], draw: false, scores: { B: b, W: w }, reason: 'Most discs' };
    return null;
  },

  aiMove(state, playerId, difficulty: AIDifficulty): ReversiMove | null {
    const side = sideOf(state, playerId);
    if (!side) return null;
    const moves = this.legalMoves(state, playerId);
    if (moves.length === 0) return null;
    const depth = difficulty === 'hard' ? 5 : difficulty === 'medium' ? 3 : 1;

    let best = moves[0];
    let bestScore = -Infinity;
    for (const m of moves) {
      const res = this.applyMove(state, m, playerId);
      if (!res.ok) continue;
      const score = minimax(res.state, depth - 1, -Infinity, Infinity, side);
      if (score > bestScore) { bestScore = score; best = m; }
    }
    return best;
  },
};

// Positional weights — corners are gold, squares next to corners are traps.
const WEIGHTS = [
  120, -20, 20, 5, 5, 20, -20, 120,
  -20, -40, -5, -5, -5, -5, -40, -20,
  20, -5, 15, 3, 3, 15, -5, 20,
  5, -5, 3, 3, 3, 3, -5, 5,
  5, -5, 3, 3, 3, 3, -5, 5,
  20, -5, 15, 3, 3, 15, -5, 20,
  -20, -40, -5, -5, -5, -5, -40, -20,
  120, -20, 20, 5, 5, 20, -20, 120,
];

function evaluate(state: ReversiState, root: Disc): number {
  let score = 0;
  for (let i = 0; i < 64; i++) {
    if (state.board[i] === root) score += WEIGHTS[i]!;
    else if (state.board[i] === opp(root)) score -= WEIGHTS[i]!;
  }
  const myMob = legalIndices(state.board, root).length;
  const oppMob = legalIndices(state.board, opp(root)).length;
  return score + 4 * (myMob - oppMob);
}

function minimax(state: ReversiState, depth: number, alpha: number, beta: number, root: Disc): number {
  if (state.winner) return state.winner === root ? 100000 : -100000;
  if (state.draw) return 0;
  if (depth <= 0) return evaluate(state, root);

  const maximizing = state.turn === root;
  const moves = legalIndices(state.board, state.turn);
  const playerId = state.players[state.turn];
  let best = maximizing ? -Infinity : Infinity;
  for (const i of moves) {
    const res = reversi.applyMove(state, { index: i }, playerId);
    if (!res.ok) continue;
    const score = minimax(res.state, depth - 1, alpha, beta, root);
    if (maximizing) { best = Math.max(best, score); alpha = Math.max(alpha, best); }
    else { best = Math.min(best, score); beta = Math.min(beta, best); }
    if (alpha >= beta) break;
  }
  return best;
}
