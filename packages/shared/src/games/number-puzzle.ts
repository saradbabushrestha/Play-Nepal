import type { GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';
import { nextRng, seedFromOptions } from './rng.js';

// ─────────────────────────────────────────────────────────────
// Number Puzzle (15-puzzle) — slide tiles into 1..15 order.
// Shuffled by random legal moves from solved → always solvable.
// ─────────────────────────────────────────────────────────────

export const NP_N = 4;

export interface NumberPuzzleState {
  board: number[]; // 16, 0 = blank
  moves: number;
  solved: boolean;
  player: string;
  lastMoved: number | null;
}

export interface NumberPuzzleMove {
  index: number; // tile to slide into the blank
}

export const numberPuzzleMeta: GameMeta = {
  id: 'number-puzzle',
  name: 'Number Puzzle',
  category: 'CASUAL',
  minPlayers: 1,
  maxPlayers: 1,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Slide the tiles to arrange 1 through 15.',
  status: 'live',
};

const SOLVED = [...Array(15).keys()].map((i) => i + 1).concat(0);
const adjacent = (a: number, b: number) => {
  const ar = Math.floor(a / NP_N), ac = a % NP_N, br = Math.floor(b / NP_N), bc = b % NP_N;
  return Math.abs(ar - br) + Math.abs(ac - bc) === 1;
};

function scramble(seed: number): { board: number[]; seed: number } {
  const board = SOLVED.slice();
  let blank = 15;
  let s = seed;
  let last = -1;
  for (let k = 0; k < 200; k++) {
    const nbrs = [blank - 1, blank + 1, blank - NP_N, blank + NP_N].filter((i) => i >= 0 && i < 16 && adjacent(i, blank) && i !== last);
    const r = nextRng(s); s = r.seed;
    const pick = nbrs[Math.floor(r.value * nbrs.length)]!;
    [board[blank], board[pick]] = [board[pick]!, board[blank]!];
    last = blank;
    blank = pick;
  }
  return { board, seed: s };
}

export const numberPuzzle: GameEngine<NumberPuzzleState, NumberPuzzleMove> = {
  meta: numberPuzzleMeta,

  createInitialState(players: PlayerSlot[], options): NumberPuzzleState {
    let { board } = scramble(seedFromOptions(options));
    // Avoid handing the player an already-solved board.
    if (board.every((v, i) => v === SOLVED[i])) board = scramble(seedFromOptions(options) + 1).board;
    return { board, moves: 0, solved: false, player: players[0]?.playerId ?? 'seat-0', lastMoved: null };
  },

  currentTurn(state) { return state.solved ? null : state.player; },

  legalMoves(state, playerId) {
    if (state.solved || state.player !== playerId) return [];
    const blank = state.board.indexOf(0);
    return state.board.map((_, i) => i).filter((i) => adjacent(i, blank)).map((index) => ({ index }));
  },

  applyMove(state, move, playerId): MoveResult<NumberPuzzleState> {
    if (state.solved) return fail('Already solved.');
    if (state.player !== playerId) return fail('Not your puzzle.');
    const blank = state.board.indexOf(0);
    if (!adjacent(move.index, blank)) return fail('That tile cannot move.');

    const next = clone(state);
    [next.board[blank], next.board[move.index]] = [next.board[move.index]!, next.board[blank]!];
    next.moves += 1;
    next.lastMoved = blank; // tile now sits where the blank was
    if (next.board.every((v, i) => v === SOLVED[i])) next.solved = true;
    return ok(next);
  },

  getResult(state): GameResult | null {
    if (!state.solved) return null;
    return { winnerId: state.player, draw: false, scores: { moves: state.moves }, reason: `Solved in ${state.moves} moves` };
  },
};
