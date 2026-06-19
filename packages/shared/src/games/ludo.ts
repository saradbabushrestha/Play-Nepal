import type { AIDifficulty, GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';
import { rollDie, seedFromOptions } from './rng.js';

// ─────────────────────────────────────────────────────────────
// Ludo — 2–4 players, 4 tokens each. Roll a 6 to start, capture
// opponents, race all four tokens home.
//
// Token "rel" position per player:
//   -1        = in base
//   0..50     = on the shared ring (global = (entry + rel) % 52)
//   51..55    = private home column
//   56        = home (finished)
// ─────────────────────────────────────────────────────────────

export const ENTRIES = [0, 13, 26, 39];
export const SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
export const HOME = 56;

export type LudoMove = { type: 'roll' } | { type: 'move'; token: number };

export interface LudoState {
  tokens: number[][]; // tokens[player][0..3] = rel position
  turn: number;
  phase: 'roll' | 'move';
  pendingRoll: number | null;
  rng: number;
  players: string[];
  entries: number[];
  lastRoll: number | null;
  /** Increments on every roll — lets the UI animate even on repeated values. */
  rollCount: number;
  winner: number | null;
}

export const ludoMeta: GameMeta = {
  id: 'ludo',
  name: 'Ludo',
  category: 'BOARD',
  minPlayers: 2,
  maxPlayers: 4,
  supportsAI: true,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Roll, race and capture — first to bring all four tokens home wins.',
  status: 'live',
};

export const globalOf = (entry: number, rel: number): number | null =>
  rel >= 0 && rel <= 50 ? (entry + rel) % 52 : null;

function movableTokens(state: LudoState, player: number, roll: number): number[] {
  const out: number[] = [];
  state.tokens[player]!.forEach((rel, i) => {
    if (rel === -1) { if (roll === 6) out.push(i); }
    else if (rel < HOME && rel + roll <= HOME) out.push(i);
  });
  return out;
}

export const ludo: GameEngine<LudoState, LudoMove> = {
  meta: ludoMeta,

  createInitialState(players: PlayerSlot[], options): LudoState {
    const seated = players.slice().sort((a, b) => a.seat - b.seat);
    const n = Math.max(2, seated.length);
    return {
      tokens: Array.from({ length: n }, () => [-1, -1, -1, -1]),
      turn: 0,
      phase: 'roll',
      pendingRoll: null,
      rng: seedFromOptions(options),
      players: seated.map((p) => p.playerId),
      entries: Array.from({ length: n }, (_, i) => ENTRIES[i % 4]!),
      lastRoll: null,
      rollCount: 0,
      winner: null,
    };
  },

  currentTurn(state) {
    if (state.winner !== null) return null;
    return state.players[state.turn] ?? null;
  },

  legalMoves(state, playerId) {
    if (state.winner !== null || state.players[state.turn] !== playerId) return [];
    if (state.phase === 'roll') return [{ type: 'roll' }];
    const roll = state.pendingRoll ?? 0;
    return movableTokens(state, state.turn, roll).map((token) => ({ type: 'move', token }));
  },

  applyMove(state, move, playerId): MoveResult<LudoState> {
    if (state.winner !== null) return fail('Game is already over.');
    if (state.players[state.turn] !== playerId) return fail('Not your turn.');
    const next = clone(state);

    if (move.type === 'roll') {
      if (next.phase !== 'roll') return fail('You have already rolled — move a token.');
      const { roll, seed } = rollDie(next.rng);
      next.rng = seed;
      next.lastRoll = roll;
      next.rollCount += 1;
      const movers = movableTokens(next, next.turn, roll);
      if (movers.length === 0) {
        // Nothing to move (even on a 6) → pass the turn.
        next.phase = 'roll';
        next.pendingRoll = null;
        next.turn = (next.turn + 1) % next.players.length;
      } else {
        next.phase = 'move';
        next.pendingRoll = roll;
      }
      return ok(next);
    }

    // move.type === 'move'
    if (next.phase !== 'move' || next.pendingRoll === null) return fail('Roll the die first.');
    const roll = next.pendingRoll;
    if (!movableTokens(next, next.turn, roll).includes(move.token)) return fail('That token can’t move.');

    const rel = next.tokens[next.turn]![move.token]!;
    const newRel = rel === -1 ? 0 : rel + roll;
    next.tokens[next.turn]![move.token] = newRel;

    // Capture on the shared ring (unless landing on a safe square).
    const g = globalOf(next.entries[next.turn]!, newRel);
    if (g !== null && !SAFE_SQUARES.has(g)) {
      next.tokens.forEach((toks, p) => {
        if (p === next.turn) return;
        toks.forEach((r, t) => {
          if (globalOf(next.entries[p]!, r) === g) next.tokens[p]![t] = -1;
        });
      });
    }

    if (next.tokens[next.turn]!.every((r) => r === HOME)) {
      next.winner = next.turn;
      return ok(next);
    }

    // A 6 earns another roll; otherwise the next player is up.
    next.phase = 'roll';
    next.pendingRoll = null;
    if (roll !== 6) next.turn = (next.turn + 1) % next.players.length;
    return ok(next);
  },

  getResult(state): GameResult | null {
    if (state.winner === null) return null;
    return { winnerId: state.players[state.winner]!, draw: false, reason: 'All tokens home' };
  },

  aiMove(state, playerId, difficulty: AIDifficulty): LudoMove | null {
    if (state.players[state.turn] !== playerId) return null;
    if (state.phase === 'roll') return { type: 'roll' };

    const roll = state.pendingRoll ?? 0;
    const movers = movableTokens(state, state.turn, roll);
    if (movers.length === 0) return null;
    if (movers.length === 1 || difficulty === 'easy') return { type: 'move', token: movers[0]! };

    // Greedy: capture > finish > release > advance furthest > reach safety.
    let best = movers[0]!;
    let bestScore = -Infinity;
    for (const token of movers) {
      const rel = state.tokens[state.turn]![token]!;
      const newRel = rel === -1 ? 0 : rel + roll;
      let score = newRel;
      if (rel === -1) score += 25;
      if (newRel === HOME) score += 120;
      const g = globalOf(state.entries[state.turn]!, newRel);
      if (g !== null && SAFE_SQUARES.has(g)) score += 12;
      if (g !== null && !SAFE_SQUARES.has(g)) {
        const captures = state.tokens.some((toks, p) =>
          p !== state.turn && toks.some((r) => globalOf(state.entries[p]!, r) === g));
        if (captures) score += 70;
      }
      if (score > bestScore) { bestScore = score; best = token; }
    }
    return { type: 'move', token: best };
  },
};
