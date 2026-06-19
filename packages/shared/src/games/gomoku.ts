import type { AIDifficulty, GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';

// ─────────────────────────────────────────────────────────────
// Gomoku (Five in a Row) — 15×15. First to five in a line wins.
// ─────────────────────────────────────────────────────────────

export const SIZE = 15;
export type Stone = 'B' | 'W';
export type Cell = Stone | 'EMPTY';

export interface GomokuState {
  board: Cell[]; // length SIZE*SIZE
  turn: Stone;
  players: Record<Stone, string>;
  winner: Stone | null;
  draw: boolean;
  winningLine: number[] | null;
  lastMove: number | null;
}

export interface GomokuMove {
  index: number;
}

export const gomokuMeta: GameMeta = {
  id: 'gomoku',
  name: 'Gomoku',
  category: 'BOARD',
  minPlayers: 2,
  maxPlayers: 2,
  supportsAI: true,
  supportsSpectators: true,
  ranked: true,
  shortDescription: 'Five in a row on a 15×15 grid — simple to learn, deep to master.',
  status: 'live',
};

const rc = (i: number) => [Math.floor(i / SIZE), i % SIZE] as const;
const at = (board: Cell[], r: number, c: number): Cell =>
  r >= 0 && r < SIZE && c >= 0 && c < SIZE ? board[r * SIZE + c]! : 'EMPTY';
const opp = (s: Stone): Stone => (s === 'B' ? 'W' : 'B');
const DIRS: Array<[number, number]> = [[0, 1], [1, 0], [1, 1], [1, -1]];

function winningLineThrough(board: Cell[], index: number, stone: Stone): number[] | null {
  const [r, c] = rc(index);
  for (const [dr, dc] of DIRS) {
    const line = [index];
    for (const sign of [-1, 1]) {
      let nr = r + dr * sign, nc = c + dc * sign;
      while (at(board, nr, nc) === stone) { line.push(nr * SIZE + nc); nr += dr * sign; nc += dc * sign; }
    }
    if (line.length >= 5) return line.sort((a, b) => a - b);
  }
  return null;
}

const sideOf = (s: GomokuState, pid: string): Stone | null =>
  s.players.B === pid ? 'B' : s.players.W === pid ? 'W' : null;

export const gomoku: GameEngine<GomokuState, GomokuMove> = {
  meta: gomokuMeta,

  createInitialState(players: PlayerSlot[]): GomokuState {
    const black = players.find((p) => p.seat === 0);
    const white = players.find((p) => p.seat === 1);
    return {
      board: Array(SIZE * SIZE).fill('EMPTY'),
      turn: 'B',
      players: { B: black?.playerId ?? 'seat-0', W: white?.playerId ?? 'seat-1' },
      winner: null,
      draw: false,
      winningLine: null,
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
    const out: GomokuMove[] = [];
    for (let i = 0; i < state.board.length; i++) if (state.board[i] === 'EMPTY') out.push({ index: i });
    return out;
  },

  applyMove(state, move, playerId): MoveResult<GomokuState> {
    if (state.winner || state.draw) return fail('Game is already over.');
    const side = sideOf(state, playerId);
    if (!side || state.turn !== side) return fail('Not your turn.');
    if (move.index < 0 || move.index >= state.board.length) return fail('Out of range.');
    if (state.board[move.index] !== 'EMPTY') return fail('Cell already taken.');

    const next = clone(state);
    next.board[move.index] = side;
    next.lastMove = move.index;
    const line = winningLineThrough(next.board, move.index, side);
    if (line) { next.winner = side; next.winningLine = line; }
    else if (next.board.every((c) => c !== 'EMPTY')) next.draw = true;
    else next.turn = opp(side);
    return ok(next);
  },

  getResult(state): GameResult | null {
    if (state.winner) return { winnerId: state.players[state.winner], draw: false, reason: 'Five in a row' };
    if (state.draw) return { winnerId: null, draw: true, reason: 'Board full' };
    return null;
  },

  aiMove(state, playerId, difficulty: AIDifficulty): GomokuMove | null {
    const side = sideOf(state, playerId);
    if (!side || state.turn !== side) return null;

    // Empty board → play centre.
    if (state.board.every((c) => c === 'EMPTY')) return { index: Math.floor(SIZE * SIZE / 2) };

    // Candidate moves: empty cells near existing stones (keeps it fast).
    const radius = 2;
    const candidates = new Set<number>();
    for (let i = 0; i < state.board.length; i++) {
      if (state.board[i] === 'EMPTY') continue;
      const [r, c] = rc(i);
      for (let dr = -radius; dr <= radius; dr++)
        for (let dc = -radius; dc <= radius; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && state.board[nr * SIZE + nc] === 'EMPTY')
            candidates.add(nr * SIZE + nc);
        }
    }
    const noise = difficulty === 'easy' ? 0.5 : difficulty === 'medium' ? 0.15 : 0;

    let best = [...candidates][0]!;
    let bestScore = -Infinity;
    for (const i of candidates) {
      // Offence: my line value here. Defence: deny opponent's value here.
      const offense = lineScore(state.board, i, side);
      const defense = lineScore(state.board, i, opp(side)) * 0.9;
      const jitter = noise * pseudo(i, state) * (offense + defense + 1);
      const score = offense + defense + jitter;
      if (score > bestScore) { bestScore = score; best = i; }
    }
    return { index: best };
  },
};

/** Score for placing `stone` at `i`: rewards long, open runs. */
function lineScore(board: Cell[], i: number, stone: Stone): number {
  const [r, c] = rc(i);
  let score = 0;
  for (const [dr, dc] of DIRS) {
    let run = 1;
    let openEnds = 0;
    for (const sign of [-1, 1]) {
      let nr = r + dr * sign, nc = c + dc * sign;
      while (at(board, nr, nc) === stone) { run++; nr += dr * sign; nc += dc * sign; }
      if (at(board, nr, nc) === 'EMPTY') openEnds++;
    }
    if (run >= 5) score += 1_000_000;
    else if (run === 4) score += openEnds === 2 ? 100_000 : openEnds === 1 ? 12_000 : 0;
    else if (run === 3) score += openEnds === 2 ? 5_000 : openEnds === 1 ? 600 : 0;
    else if (run === 2) score += openEnds === 2 ? 250 : 40;
    else score += openEnds * 5;
  }
  return score;
}

/** Deterministic jitter so "easy" varies without Math.random. */
function pseudo(i: number, state: GomokuState): number {
  const filled = state.board.filter((c) => c !== 'EMPTY').length;
  const x = Math.sin((i + 1) * 12.9898 + filled * 78.233) * 43758.5453;
  return x - Math.floor(x);
}
