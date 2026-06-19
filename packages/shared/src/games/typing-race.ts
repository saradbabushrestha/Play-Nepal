import type { GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';
import { randomInt, seedFromOptions } from './rng.js';

// ─────────────────────────────────────────────────────────────
// Typing Speed Race — everyone types the same passage; the client
// measures time + accuracy and submits. Ranked by words per minute.
// ─────────────────────────────────────────────────────────────

const PASSAGES = [
  'The quick brown fox jumps over the lazy dog while the sun sets behind the mountains.',
  'Practice makes perfect, so keep your fingers moving and your eyes on the screen ahead.',
  'A journey of a thousand miles begins with a single step and a steady, focused mind.',
  'Coffee in hand, the developer typed line after line until the bug finally vanished.',
  'Momos steaming in the kitchen, friends gathered around to share stories and laughter.',
];

export interface TypingResult {
  wpm: number;
  accuracy: number;
  ms: number;
}

export interface TypingRaceState {
  passage: string;
  results: Record<string, TypingResult>;
  players: string[];
  finished: boolean;
}

export interface TypingRaceMove {
  ms: number;
  correct: number;
  total: number;
}

export const typingRaceMeta: GameMeta = {
  id: 'typing-race',
  name: 'Typing Speed Race',
  category: 'EDUCATIONAL',
  minPlayers: 1,
  maxPlayers: 8,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Type the passage as fast and accurately as you can.',
  status: 'live',
};

export const typingRace: GameEngine<TypingRaceState, TypingRaceMove> = {
  meta: typingRaceMeta,

  createInitialState(players: PlayerSlot[], options): TypingRaceState {
    const r = randomInt(seedFromOptions(options), 0, PASSAGES.length - 1);
    return { passage: PASSAGES[r.value]!, results: {}, players: players.map((p) => p.playerId), finished: false };
  },

  currentTurn() {
    return null; // simultaneous
  },

  legalMoves(state, playerId) {
    if (state.finished || !state.players.includes(playerId) || state.results[playerId]) return [];
    return [{ ms: 0, correct: 0, total: 0 }];
  },

  applyMove(state, move, playerId): MoveResult<TypingRaceState> {
    if (state.finished) return fail('Race over.');
    if (!state.players.includes(playerId)) return fail('You are not in this race.');
    if (state.results[playerId]) return fail('You already finished.');
    const ms = Math.max(1, Math.floor(move.ms));
    const total = Math.max(1, Math.floor(move.total));
    const correct = Math.max(0, Math.min(total, Math.floor(move.correct)));

    const next = clone(state);
    const wpm = Math.round((correct / 5) / (ms / 60000));
    const accuracy = Math.round((correct / total) * 100);
    next.results[playerId] = { wpm, accuracy, ms };
    if (next.players.every((p) => next.results[p])) next.finished = true;
    return ok(next);
  },

  getResult(state): GameResult | null {
    if (!state.finished) return null;
    let winner: string | null = null;
    let top = -1;
    let tie = false;
    const scores: Record<string, number> = {};
    for (const p of state.players) {
      const wpm = state.results[p]?.wpm ?? 0;
      scores[p] = wpm;
      if (wpm > top) { top = wpm; winner = p; tie = false; }
      else if (wpm === top) tie = true;
    }
    return { winnerId: tie ? null : winner, draw: tie, scores, reason: `${top} WPM` };
  },
};
