import type { AIDifficulty, GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';

export type Mark = 'X' | 'O';
export type Cell = Mark | null;

export interface TicTacToeState {
  board: Cell[]; // length 9
  turn: Mark;
  /** role -> engine playerId */
  players: Record<Mark, string>;
  winner: Mark | null;
  winningLine: number[] | null;
  draw: boolean;
}

export interface TicTacToeMove {
  index: number; // 0..8
}

const LINES: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],            // diagonals
];

export const ticTacToeMeta: GameMeta = {
  id: 'tic-tac-toe',
  name: 'Tic Tac Toe',
  category: 'BOARD',
  minPlayers: 2,
  maxPlayers: 2,
  supportsAI: true,
  supportsSpectators: true,
  ranked: true,
  shortDescription: 'The classic 3×3 race to three in a row.',
  status: 'live',
};

function findWin(board: Cell[]): { mark: Mark; line: number[] } | null {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { mark: board[a] as Mark, line };
    }
  }
  return null;
}

export const ticTacToe: GameEngine<TicTacToeState, TicTacToeMove> = {
  meta: ticTacToeMeta,

  createInitialState(players: PlayerSlot[]): TicTacToeState {
    const x = players.find((p) => p.seat === 0);
    const o = players.find((p) => p.seat === 1);
    return {
      board: Array(9).fill(null),
      turn: 'X',
      players: { X: x?.playerId ?? 'seat-0', O: o?.playerId ?? 'seat-1' },
      winner: null,
      winningLine: null,
      draw: false,
    };
  },

  currentTurn(state) {
    if (state.winner || state.draw) return null;
    return state.players[state.turn];
  },

  legalMoves(state, playerId) {
    if (this.currentTurn(state) !== playerId) return [];
    const moves: TicTacToeMove[] = [];
    state.board.forEach((cell, index) => {
      if (cell === null) moves.push({ index });
    });
    return moves;
  },

  applyMove(state, move, playerId): MoveResult<TicTacToeState> {
    if (state.winner || state.draw) return fail('Game is already over.');
    if (this.currentTurn(state) !== playerId) return fail('Not your turn.');
    if (move.index < 0 || move.index > 8) return fail('Cell out of range.');
    if (state.board[move.index] !== null) return fail('Cell already taken.');

    const next = clone(state);
    next.board[move.index] = next.turn;

    const win = findWin(next.board);
    if (win) {
      next.winner = win.mark;
      next.winningLine = win.line;
    } else if (next.board.every((c) => c !== null)) {
      next.draw = true;
    } else {
      next.turn = next.turn === 'X' ? 'O' : 'X';
    }
    return ok(next);
  },

  getResult(state): GameResult | null {
    if (state.winner) {
      return { winnerId: state.players[state.winner], draw: false, reason: 'Three in a row' };
    }
    if (state.draw) return { winnerId: null, draw: true, reason: 'Board full' };
    return null;
  },

  aiMove(state, playerId, difficulty: AIDifficulty): TicTacToeMove | null {
    const moves = this.legalMoves(state, playerId);
    if (moves.length === 0) return null;

    // Easy: random. Medium: 70% optimal. Hard: perfect minimax.
    const roll = difficulty === 'hard' ? 1 : difficulty === 'medium' ? 0.7 : 0;
    if (pseudoRandom(state) > roll) {
      return moves[Math.floor(pseudoRandom(state) * moves.length) % moves.length];
    }

    const me = state.turn;
    let best = moves[0];
    let bestScore = -Infinity;
    for (const m of moves) {
      const board = state.board.slice();
      board[m.index] = me;
      const score = minimax(board, me === 'X' ? 'O' : 'X', me);
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }
    return best;
  },
};

/** Deterministic pseudo-randomness derived from filled cells (replay-safe). */
function pseudoRandom(state: TicTacToeState): number {
  const filled = state.board.filter((c) => c !== null).length;
  const x = Math.sin(filled * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Minimax score from `root`'s perspective: +1 win / -1 loss / 0 draw. */
function minimax(board: Cell[], toMove: Mark, root: Mark): number {
  const win = findWin(board);
  if (win) return win.mark === root ? 1 : -1;
  if (board.every((c) => c !== null)) return 0;

  const isMax = toMove === root;
  let best = isMax ? -Infinity : Infinity;
  for (let i = 0; i < 9; i++) {
    if (board[i] !== null) continue;
    const next = board.slice();
    next[i] = toMove;
    const score = minimax(next, toMove === 'X' ? 'O' : 'X', root);
    best = isMax ? Math.max(best, score) : Math.min(best, score);
  }
  return best;
}
