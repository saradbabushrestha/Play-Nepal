import type { AIDifficulty, GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';

// ─────────────────────────────────────────────────────────────
// Dots and Boxes — claim edges; complete a box to score & move again.
// ─────────────────────────────────────────────────────────────

export const BOXES = 5; // 5×5 grid of boxes (6×6 dots)

export type EdgeType = 'H' | 'V';
export interface DotsMove { type: EdgeType; index: number }

export interface DotsState {
  size: number;
  /** Horizontal edges: (BOXES+1) rows × BOXES cols. */
  hEdges: boolean[];
  /** Vertical edges: BOXES rows × (BOXES+1) cols. */
  vEdges: boolean[];
  /** Box owner by player index, or -1 if unclaimed. */
  owner: number[];
  turn: number; // player index
  scores: number[];
  players: string[]; // playerId per seat
  winner: number | null; // player index, or -1 for draw, null if ongoing
  lastMove: DotsMove | null;
}

export const dotsAndBoxesMeta: GameMeta = {
  id: 'dots-and-boxes',
  name: 'Dots and Boxes',
  category: 'BOARD',
  minPlayers: 2,
  maxPlayers: 2,
  supportsAI: true,
  supportsSpectators: true,
  ranked: true,
  shortDescription: 'Close the most boxes — chains and sacrifices decide it.',
  status: 'live',
};

const hIndex = (r: number, c: number) => r * BOXES + c;       // r in 0..BOXES, c in 0..BOXES-1
const vIndex = (r: number, c: number) => r * (BOXES + 1) + c; // r in 0..BOXES-1, c in 0..BOXES

/** Edges of box (r,c): top, bottom (H) and left, right (V). */
function boxEdges(r: number, c: number) {
  return {
    top: hIndex(r, c),
    bottom: hIndex(r + 1, c),
    left: vIndex(r, c),
    right: vIndex(r, c + 1),
  };
}

function sidesOfBox(state: DotsState, r: number, c: number): number {
  const e = boxEdges(r, c);
  return (
    (state.hEdges[e.top] ? 1 : 0) +
    (state.hEdges[e.bottom] ? 1 : 0) +
    (state.vEdges[e.left] ? 1 : 0) +
    (state.vEdges[e.right] ? 1 : 0)
  );
}

function isTaken(state: DotsState, move: DotsMove): boolean {
  return move.type === 'H' ? state.hEdges[move.index]! : state.vEdges[move.index]!;
}

function allMoves(state: DotsState): DotsMove[] {
  const out: DotsMove[] = [];
  for (let i = 0; i < state.hEdges.length; i++) if (!state.hEdges[i]) out.push({ type: 'H', index: i });
  for (let i = 0; i < state.vEdges.length; i++) if (!state.vEdges[i]) out.push({ type: 'V', index: i });
  return out;
}

export const dotsAndBoxes: GameEngine<DotsState, DotsMove> = {
  meta: dotsAndBoxesMeta,

  createInitialState(players: PlayerSlot[]): DotsState {
    const seats = players.length >= 2 ? players.length : 2;
    return {
      size: BOXES,
      hEdges: Array((BOXES + 1) * BOXES).fill(false),
      vEdges: Array(BOXES * (BOXES + 1)).fill(false),
      owner: Array(BOXES * BOXES).fill(-1),
      turn: 0,
      scores: Array(seats).fill(0),
      players: players.sort((a, b) => a.seat - b.seat).map((p) => p.playerId),
      winner: null,
      lastMove: null,
    };
  },

  currentTurn(state) {
    if (state.winner !== null) return null;
    return state.players[state.turn] ?? null;
  },

  legalMoves(state, playerId) {
    if (state.winner !== null || state.players[state.turn] !== playerId) return [];
    return allMoves(state);
  },

  applyMove(state, move, playerId): MoveResult<DotsState> {
    if (state.winner !== null) return fail('Game is already over.');
    if (state.players[state.turn] !== playerId) return fail('Not your turn.');
    if (move.type === 'H' ? move.index < 0 || move.index >= state.hEdges.length : move.index < 0 || move.index >= state.vEdges.length)
      return fail('Edge out of range.');
    if (isTaken(state, move)) return fail('Edge already claimed.');

    const next = clone(state);
    if (move.type === 'H') next.hEdges[move.index] = true;
    else next.vEdges[move.index] = true;
    next.lastMove = move;

    // Did this edge complete any box? If so, score and move again.
    let completed = 0;
    for (let r = 0; r < BOXES; r++) {
      for (let c = 0; c < BOXES; c++) {
        if (next.owner[r * BOXES + c] === -1 && sidesOfBox(next, r, c) === 4) {
          next.owner[r * BOXES + c] = next.turn;
          next.scores[next.turn] = (next.scores[next.turn] ?? 0) + 1;
          completed++;
        }
      }
    }

    if (next.owner.every((o) => o !== -1)) {
      const top = Math.max(...next.scores);
      const winners = next.scores.filter((s) => s === top).length;
      next.winner = winners > 1 ? -1 : next.scores.indexOf(top);
    } else if (completed === 0) {
      next.turn = (next.turn + 1) % next.players.length;
    }
    return ok(next);
  },

  getResult(state): GameResult | null {
    if (state.winner === null) return null;
    if (state.winner === -1) return { winnerId: null, draw: true, reason: 'Equal boxes' };
    return { winnerId: state.players[state.winner]!, draw: false, reason: 'Most boxes' };
  },

  aiMove(state, playerId, difficulty: AIDifficulty): DotsMove | null {
    if (state.players[state.turn] !== playerId) return null;
    const moves = allMoves(state);
    if (moves.length === 0) return null;

    // 1) Always take a move that completes a box (free point + another turn).
    const completing = moves.filter((m) => completesBox(state, m));
    if (completing.length > 0) return completing[0]!;

    // 2) Prefer "safe" moves that don't give a box away (don't create a 3-sided box).
    const safe = moves.filter((m) => !createsThirdSide(state, m));
    const pool = safe.length > 0 ? safe : moves; // otherwise forced to sacrifice

    if (difficulty === 'easy') return pool[Math.floor(pseudo(state) * pool.length) % pool.length]!;
    // Medium/hard: among sacrifices, give away the smallest chain.
    if (safe.length === 0) {
      return [...moves].sort((a, b) => chainCost(state, a) - chainCost(state, b))[0]!;
    }
    return pool[Math.floor(pseudo(state) * pool.length) % pool.length]!;
  },
};

function completesBox(state: DotsState, move: DotsMove): boolean {
  const probe = clone(state);
  if (move.type === 'H') probe.hEdges[move.index] = true;
  else probe.vEdges[move.index] = true;
  for (let r = 0; r < BOXES; r++)
    for (let c = 0; c < BOXES; c++)
      if (state.owner[r * BOXES + c] === -1 && sidesOfBox(probe, r, c) === 4) return true;
  return false;
}

function createsThirdSide(state: DotsState, move: DotsMove): boolean {
  const probe = clone(state);
  if (move.type === 'H') probe.hEdges[move.index] = true;
  else probe.vEdges[move.index] = true;
  for (let r = 0; r < BOXES; r++)
    for (let c = 0; c < BOXES; c++)
      if (state.owner[r * BOXES + c] === -1 && sidesOfBox(probe, r, c) === 3) return true;
  return false;
}

/** Rough size of the chain a sacrificing move opens up (smaller is better). */
function chainCost(state: DotsState, move: DotsMove): number {
  const probe = clone(state);
  if (move.type === 'H') probe.hEdges[move.index] = true;
  else probe.vEdges[move.index] = true;
  let three = 0;
  for (let r = 0; r < BOXES; r++)
    for (let c = 0; c < BOXES; c++)
      if (probe.owner[r * BOXES + c] === -1 && sidesOfBox(probe, r, c) === 3) three++;
  return three;
}

function pseudo(state: DotsState): number {
  const filled = state.hEdges.filter(Boolean).length + state.vEdges.filter(Boolean).length;
  const x = Math.sin(filled * 12.9898 + 4.1) * 43758.5453;
  return x - Math.floor(x);
}
