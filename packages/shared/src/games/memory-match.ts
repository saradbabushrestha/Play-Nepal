import type { AIDifficulty, GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';
import { nextRng, seedFromOptions, shuffle } from './rng.js';

// ─────────────────────────────────────────────────────────────
// Memory Match — flip two cards to find pairs. 1–4 players, turn-based.
// ─────────────────────────────────────────────────────────────

export const PAIRS = 8; // 16 cards on a 4×4 grid

export interface MemoryState {
  cards: number[];       // hidden pair value per card index (redacted by viewFor)
  matched: boolean[];    // permanently matched
  flipped: number[];     // first card face-up this turn (0 or 1 entries)
  lastMismatch: number[] | null; // last pair to flash before hiding
  turn: number;
  scores: number[];
  players: string[];
  rng: number;
  winner: number | null; // player index, -1 draw, null ongoing
}

export interface MemoryMove {
  index: number;
}

export const memoryMatchMeta: GameMeta = {
  id: 'memory-match',
  name: 'Memory Match',
  category: 'CASUAL',
  minPlayers: 1,
  maxPlayers: 4,
  supportsAI: true,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Flip cards, remember positions, collect the most pairs.',
  status: 'live',
};

export const memoryMatch: GameEngine<MemoryState, MemoryMove> = {
  meta: memoryMatchMeta,

  createInitialState(players: PlayerSlot[], options): MemoryState {
    const values = [...Array(PAIRS).keys()].flatMap((v) => [v, v]);
    const { result: cards, seed } = shuffle(values, seedFromOptions(options));
    const seated = players.slice().sort((a, b) => a.seat - b.seat);
    const n = Math.max(1, seated.length);
    return {
      cards,
      matched: Array(cards.length).fill(false),
      flipped: [],
      lastMismatch: null,
      turn: 0,
      scores: Array(n).fill(0),
      players: seated.map((p) => p.playerId),
      rng: seed,
      winner: null,
    };
  },

  currentTurn(state) {
    if (state.winner !== null) return null;
    return state.players[state.turn] ?? null;
  },

  legalMoves(state, playerId) {
    if (state.winner !== null || state.players[state.turn] !== playerId) return [];
    return state.cards
      .map((_, i) => i)
      .filter((i) => !state.matched[i] && !state.flipped.includes(i))
      .map((index) => ({ index }));
  },

  applyMove(state, move, playerId): MoveResult<MemoryState> {
    if (state.winner !== null) return fail('Game is over.');
    if (state.players[state.turn] !== playerId) return fail('Not your turn.');
    const { index } = move;
    if (index < 0 || index >= state.cards.length) return fail('Card out of range.');
    if (state.matched[index]) return fail('Card already matched.');
    if (state.flipped.includes(index)) return fail('Card already face-up.');

    const next = clone(state);
    next.lastMismatch = null;
    next.rng = nextRng(next.rng).seed; // advance so AI choices vary over time

    if (next.flipped.length === 0) {
      next.flipped = [index]; // first flip — same player flips again
      return ok(next);
    }

    // Second flip resolves the turn.
    const first = next.flipped[0]!;
    if (next.cards[first] === next.cards[index]) {
      next.matched[first] = true;
      next.matched[index] = true;
      next.scores[next.turn] = (next.scores[next.turn] ?? 0) + 1;
      next.flipped = [];
      if (next.matched.every(Boolean)) {
        const top = Math.max(...next.scores);
        next.winner = next.scores.filter((s) => s === top).length > 1 ? -1 : next.scores.indexOf(top);
      }
      // Matching keeps the turn.
    } else {
      next.lastMismatch = [first, index];
      next.flipped = [];
      next.turn = (next.turn + 1) % next.players.length;
    }
    return ok(next);
  },

  getResult(state): GameResult | null {
    if (state.winner === null) return null;
    if (state.winner === -1) return { winnerId: null, draw: true, reason: 'Tied on pairs' };
    return { winnerId: state.players[state.winner]!, draw: false, reason: 'Most pairs' };
  },

  // Redact unrevealed card values so the client can't peek.
  viewFor(state, _viewer) {
    const visible = state.cards.map((v, i) =>
      state.matched[i] || state.flipped.includes(i) || state.lastMismatch?.includes(i) ? v : -1,
    );
    return { ...clone(state), cards: visible };
  },

  aiMove(state, playerId, difficulty: AIDifficulty): MemoryMove | null {
    if (state.players[state.turn] !== playerId) return null;
    const available = state.cards.map((_, i) => i).filter((i) => !state.matched[i] && !state.flipped.includes(i));
    if (available.length === 0) return null;

    const memory = difficulty === 'hard' ? 1 : difficulty === 'medium' ? 0.5 : 0.15;
    const knows = (i: number) => pseudo(state, i) < memory; // simulated recall

    if (state.flipped.length === 1) {
      // Try to complete the pair if the AI "remembers" the match.
      const first = state.flipped[0]!;
      const match = available.find((i) => state.cards[i] === state.cards[first] && knows(i));
      if (match !== undefined) return { index: match };
      return { index: pick(available, state) };
    }

    // First flip: if the AI knows a full pair among hidden cards, open it.
    for (const i of available) {
      const partner = available.find((j) => j !== i && state.cards[j] === state.cards[i]);
      if (partner !== undefined && knows(i) && knows(partner)) return { index: i };
    }
    return { index: pick(available, state) };
  },
};

function pick(available: number[], state: MemoryState): number {
  const r = nextRng(state.rng + state.flipped.length);
  return available[Math.floor(r.value * available.length)]!;
}

function pseudo(state: MemoryState, i: number): number {
  const x = Math.sin((i + 1) * 12.9898 + state.rng * 0.0001) * 43758.5453;
  return x - Math.floor(x);
}
