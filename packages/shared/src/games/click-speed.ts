import type { GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';

// ─────────────────────────────────────────────────────────────
// Click Speed Test — click as fast as you can for 5 seconds. The
// client runs the timer and submits the final count; the engine ranks.
// ─────────────────────────────────────────────────────────────

export const CS_DURATION_MS = 5000;

export interface ClickSpeedState {
  durationMs: number;
  clicks: Record<string, number>;
  submitted: string[];
  players: string[];
  finished: boolean;
}

export interface ClickSpeedMove {
  clicks: number;
}

export const clickSpeedMeta: GameMeta = {
  id: 'click-speed',
  name: 'Click Speed Test',
  category: 'CASUAL',
  minPlayers: 1,
  maxPlayers: 8,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'How many clicks can you land in five seconds?',
  status: 'live',
};

export const clickSpeed: GameEngine<ClickSpeedState, ClickSpeedMove> = {
  meta: clickSpeedMeta,

  createInitialState(players: PlayerSlot[]): ClickSpeedState {
    return {
      durationMs: CS_DURATION_MS,
      clicks: {},
      submitted: [],
      players: players.map((p) => p.playerId),
      finished: false,
    };
  },

  currentTurn() {
    return null; // simultaneous
  },

  legalMoves(state, playerId) {
    if (state.finished || !state.players.includes(playerId) || state.submitted.includes(playerId)) return [];
    return [{ clicks: 0 }];
  },

  applyMove(state, move, playerId): MoveResult<ClickSpeedState> {
    if (state.finished) return fail('Test complete.');
    if (!state.players.includes(playerId)) return fail('You are not in this test.');
    if (state.submitted.includes(playerId)) return fail('You already submitted.');
    const clicks = Number.isFinite(move.clicks) ? Math.max(0, Math.floor(move.clicks)) : 0;

    const next = clone(state);
    next.clicks[playerId] = clicks;
    next.submitted.push(playerId);
    if (next.players.every((p) => next.submitted.includes(p))) next.finished = true;
    return ok(next);
  },

  getResult(state): GameResult | null {
    if (!state.finished) return null;
    let winner: string | null = null;
    let top = -1;
    let tie = false;
    for (const p of state.players) {
      const c = state.clicks[p] ?? 0;
      if (c > top) { top = c; winner = p; tie = false; }
      else if (c === top) tie = true;
    }
    return { winnerId: tie ? null : winner, draw: tie, scores: state.clicks, reason: `${top} clicks (${(top / (state.durationMs / 1000)).toFixed(1)} CPS)` };
  },
};
