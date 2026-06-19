import type { AIDifficulty, GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';

// ─────────────────────────────────────────────────────────────
// Baghchal ("Tiger goes the goat") — a 5×5 Nepali strategy game.
// 4 Tigers vs 20 Goats. Tigers win by capturing 5 goats; Goats win
// by immobilising all four tigers.
// ─────────────────────────────────────────────────────────────

export type Piece = 'EMPTY' | 'TIGER' | 'GOAT';
export type Side = 'GOAT' | 'TIGER';
export type Phase = 'placement' | 'movement';

export interface BaghchalState {
  board: Piece[]; // length 25, index = row * 5 + col
  turn: Side;
  phase: Phase;
  goatsPlaced: number;   // 0..20
  goatsCaptured: number; // 0..5
  players: Record<Side, string>;
  winner: Side | null;
  draw: boolean;
  /** Plies since the last capture/placement; a draw is called at the cap. */
  idlePlies: number;
  lastMove: BaghchalMove | null;
}

export type BaghchalMove =
  | { type: 'place'; to: number }
  | { type: 'move'; from: number; to: number }
  | { type: 'capture'; from: number; over: number; to: number };

export const TIGER_START = [0, 4, 20, 24];
export const GOATS_TOTAL = 20;
export const GOATS_TO_LOSE = 5;
/** Movement-phase plies without a capture before the game is a draw. */
export const IDLE_DRAW_LIMIT = 60;

export const baghchalMeta: GameMeta = {
  id: 'baghchal',
  name: 'Baghchal',
  category: 'NEPALI_TRADITIONAL',
  minPlayers: 2,
  maxPlayers: 2,
  supportsAI: true,
  supportsSpectators: true,
  ranked: true,
  shortDescription: 'Nepal’s ancient tigers-vs-goats board game of trap and hunt.',
  status: 'live',
};

// ── Board graph ────────────────────────────────────────────────
const inBounds = (r: number, c: number) => r >= 0 && r < 5 && c >= 0 && c < 5;

/** Adjacency for the Baghchal board: orthogonal everywhere, diagonals on
 *  points where (row + col) is even — reproducing the classic line pattern. */
export const NEIGHBORS: number[][] = (() => {
  const n: number[][] = Array.from({ length: 25 }, () => []);
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const i = r * 5 + c;
      const steps: Array<[number, number]> = [
        [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1],
      ];
      if ((r + c) % 2 === 0) {
        steps.push([r - 1, c - 1], [r - 1, c + 1], [r + 1, c - 1], [r + 1, c + 1]);
      }
      for (const [rr, cc] of steps) if (inBounds(rr, cc)) n[i].push(rr * 5 + cc);
    }
  }
  return n;
})();

/** Landing square if a tiger at `from` jumps over neighbour `over`. */
function jumpTarget(from: number, over: number): number | null {
  const fr = Math.floor(from / 5), fc = from % 5;
  const or = Math.floor(over / 5), oc = over % 5;
  const tr = or + (or - fr), tc = oc + (oc - fc);
  if (!inBounds(tr, tc)) return null;
  const to = tr * 5 + tc;
  return NEIGHBORS[over].includes(to) ? to : null;
}

function movesForSide(state: BaghchalState, side: Side): BaghchalMove[] {
  if (state.winner || state.draw) return [];
  const moves: BaghchalMove[] = [];
  const { board } = state;

  if (side === 'GOAT') {
    if (state.phase === 'placement') {
      for (let i = 0; i < 25; i++) if (board[i] === 'EMPTY') moves.push({ type: 'place', to: i });
    } else {
      for (let i = 0; i < 25; i++) {
        if (board[i] !== 'GOAT') continue;
        for (const j of NEIGHBORS[i]) if (board[j] === 'EMPTY') moves.push({ type: 'move', from: i, to: j });
      }
    }
    return moves;
  }

  // Tigers: slide to an empty neighbour, or jump-capture an adjacent goat.
  for (let i = 0; i < 25; i++) {
    if (board[i] !== 'TIGER') continue;
    for (const j of NEIGHBORS[i]) {
      if (board[j] === 'EMPTY') {
        moves.push({ type: 'move', from: i, to: j });
      } else if (board[j] === 'GOAT') {
        const to = jumpTarget(i, j);
        if (to !== null && board[to] === 'EMPTY') moves.push({ type: 'capture', from: i, over: j, to });
      }
    }
  }
  return moves;
}

function sideOf(state: BaghchalState, playerId: string): Side | null {
  if (state.players.GOAT === playerId) return 'GOAT';
  if (state.players.TIGER === playerId) return 'TIGER';
  return null;
}

function sameMove(a: BaghchalMove, b: BaghchalMove): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'place') return a.to === (b as typeof a).to;
  if (a.type === 'move') return a.from === (b as typeof a).from && a.to === (b as typeof a).to;
  const bc = b as Extract<BaghchalMove, { type: 'capture' }>;
  return a.type === 'capture' && a.from === bc.from && a.over === bc.over && a.to === bc.to;
}

export const baghchal: GameEngine<BaghchalState, BaghchalMove> = {
  meta: baghchalMeta,

  createInitialState(players: PlayerSlot[]): BaghchalState {
    const board: Piece[] = Array(25).fill('EMPTY');
    for (const t of TIGER_START) board[t] = 'TIGER';
    const tiger = players.find((p) => p.seat === 0);
    const goat = players.find((p) => p.seat === 1);
    return {
      board,
      turn: 'GOAT', // goats move first
      phase: 'placement',
      goatsPlaced: 0,
      goatsCaptured: 0,
      players: { TIGER: tiger?.playerId ?? 'seat-0', GOAT: goat?.playerId ?? 'seat-1' },
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
    return movesForSide(state, side);
  },

  applyMove(state, move, playerId): MoveResult<BaghchalState> {
    if (state.winner || state.draw) return fail('Game is already over.');
    const side = sideOf(state, playerId);
    if (!side) return fail('You are not seated in this match.');
    if (state.turn !== side) return fail('Not your turn.');
    if (!movesForSide(state, side).some((m) => sameMove(m, move))) return fail('Illegal move.');

    const next = clone(state);
    switch (move.type) {
      case 'place':
        next.board[move.to] = 'GOAT';
        next.goatsPlaced += 1;
        if (next.goatsPlaced >= GOATS_TOTAL) next.phase = 'movement';
        break;
      case 'move':
        next.board[move.to] = next.board[move.from];
        next.board[move.from] = 'EMPTY';
        break;
      case 'capture':
        next.board[move.to] = 'TIGER';
        next.board[move.from] = 'EMPTY';
        next.board[move.over] = 'EMPTY';
        next.goatsCaptured += 1;
        break;
    }
    next.lastMove = move;
    next.turn = side === 'GOAT' ? 'TIGER' : 'GOAT';

    // Track progress: captures and placements reset the idle counter.
    next.idlePlies = move.type === 'capture' || move.type === 'place' ? 0 : next.idlePlies + 1;

    // Resolve terminal conditions.
    if (next.goatsCaptured >= GOATS_TO_LOSE) {
      next.winner = 'TIGER';
    } else if (movesForSide(next, next.turn).length === 0) {
      // The side to move is stuck → the other side wins (traps all tigers,
      // or — rarely — immobilises every goat).
      next.winner = next.turn === 'TIGER' ? 'GOAT' : 'TIGER';
    } else if (next.idlePlies >= IDLE_DRAW_LIMIT) {
      next.draw = true;
    }
    return ok(next);
  },

  getResult(state): GameResult | null {
    if (state.draw) {
      return { winnerId: null, draw: true, scores: { captured: state.goatsCaptured }, reason: 'Draw by inactivity' };
    }
    if (!state.winner) return null;
    return {
      winnerId: state.players[state.winner],
      draw: false,
      scores: { captured: state.goatsCaptured },
      reason:
        state.winner === 'TIGER'
          ? state.goatsCaptured >= GOATS_TO_LOSE
            ? 'Tigers captured 5 goats'
            : 'Goats immobilised'
          : 'Tigers trapped',
    };
  },

  aiMove(state, playerId, difficulty: AIDifficulty): BaghchalMove | null {
    const side = sideOf(state, playerId);
    if (!side || state.turn !== side) return null;
    const moves = movesForSide(state, side);
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];

    const depth = difficulty === 'hard' ? 4 : difficulty === 'medium' ? 3 : 1;

    let best = moves[0];
    let bestScore = -Infinity;
    for (const m of moves) {
      const res = this.applyMove(state, m, playerId);
      if (!res.ok) continue;
      // Negamax: score from the opponent's view then negate.
      const score = -search(res.state, depth - 1, -Infinity, Infinity, side === 'GOAT' ? 'TIGER' : 'GOAT');
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }
    return best;
  },
};

/** Alpha-beta search returning a score from `toMove`'s perspective. */
function search(state: BaghchalState, depth: number, alpha: number, beta: number, toMove: Side): number {
  if (state.winner) {
    // Terminal: huge magnitude, signed for whoever is to move.
    return state.winner === toMove ? 100000 : -100000;
  }
  if (depth === 0) return evaluate(state, toMove);

  const moves = movesForSide(state, toMove);
  if (moves.length === 0) return -100000; // stuck = loss for side to move

  let best = -Infinity;
  const playerId = state.players[toMove];
  for (const m of moves) {
    const res = baghchal.applyMove(state, m, playerId);
    if (!res.ok) continue;
    const score = -search(res.state, depth - 1, -beta, -alpha, toMove === 'GOAT' ? 'TIGER' : 'GOAT');
    best = Math.max(best, score);
    alpha = Math.max(alpha, score);
    if (alpha >= beta) break;
  }
  return best;
}

/** Static heuristic from `toMove`'s perspective. */
function evaluate(state: BaghchalState, toMove: Side): number {
  // Captured goats dominate; tiger mobility & threats matter next.
  const tigerMobility = movesForSide({ ...state, turn: 'TIGER', winner: null, draw: false }, 'TIGER');
  const captureThreats = tigerMobility.filter((m) => m.type === 'capture').length;
  const tigerScore =
    state.goatsCaptured * 100 + captureThreats * 8 + tigerMobility.length * 1;
  // Goats want to reduce tiger mobility & avoid being captured.
  const goatScore = -tigerScore;
  const raw = toMove === 'TIGER' ? tigerScore : goatScore;
  return raw;
}
