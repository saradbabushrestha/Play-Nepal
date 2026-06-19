import type { GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';
import { seedFromOptions, shuffle } from './rng.js';

// ─────────────────────────────────────────────────────────────
// Meme Battle — each round everyone writes a caption for the prompt,
// then votes (anonymously) for the funniest one. No images needed.
// ─────────────────────────────────────────────────────────────

const PROMPTS = [
  'When the deploy works on the first try…',
  'Me explaining my weekend plans to my boss on Friday at 4:59pm',
  'That moment the wifi drops mid-meeting',
  'When someone says "quick question" at 6pm',
  'My face when the code compiles but I don’t know why',
  'When the momos arrive before the meeting ends',
  'Trying to look busy when the manager walks by',
  'When you find a bug in production at midnight',
  'Me after saying "I’ll just check one thing"',
  'When the standup could have been an email',
];

export interface MemeBattleState {
  prompts: string[];
  round: number;
  totalRounds: number;
  phase: 'caption' | 'vote';
  submissions: Record<string, string>;
  roundCaptions: { author: string; text: string }[];
  roundVotes: Record<string, number>;
  scores: Record<string, number>;
  players: string[];
  names: string[];
  rng: number;
  finished: boolean;
}

export type MemeBattleMove = { type: 'caption'; text: string } | { type: 'vote'; captionIndex: number };

export const memeBattleMeta: GameMeta = {
  id: 'meme-battle',
  name: 'Meme Battle',
  category: 'PARTY',
  minPlayers: 3,
  maxPlayers: 16,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Caption the prompt, then vote for the funniest — wittiest wins.',
  status: 'live',
};

export const memeBattle: GameEngine<MemeBattleState, MemeBattleMove> = {
  meta: memeBattleMeta,

  createInitialState(players: PlayerSlot[], options): MemeBattleState {
    const seated = players.slice().sort((a, b) => a.seat - b.seat);
    const { result } = shuffle(PROMPTS, seedFromOptions(options));
    return {
      prompts: result.slice(0, Math.min(5, result.length)),
      round: 0,
      totalRounds: Math.min(5, result.length),
      phase: 'caption',
      submissions: {},
      roundCaptions: [],
      roundVotes: {},
      scores: Object.fromEntries(seated.map((p) => [p.playerId, 0])),
      players: seated.map((p) => p.playerId),
      names: seated.map((p) => p.displayName),
      rng: seedFromOptions(options),
      finished: false,
    };
  },

  currentTurn() {
    return null;
  },

  legalMoves(state, playerId) {
    if (state.finished || !state.players.includes(playerId)) return [];
    if (state.phase === 'caption') return state.submissions[playerId] !== undefined ? [] : [{ type: 'caption', text: '' }];
    if (state.roundVotes[playerId] !== undefined) return [];
    return state.roundCaptions
      .map((_, captionIndex): MemeBattleMove => ({ type: 'vote', captionIndex }))
      .filter((m) => m.type === 'vote' && state.roundCaptions[m.captionIndex]!.author !== playerId);
  },

  applyMove(state, move, playerId): MoveResult<MemeBattleState> {
    if (state.finished) return fail('Game over.');
    if (!state.players.includes(playerId)) return fail('You are not in this game.');
    const next = clone(state);

    if (move.type === 'caption') {
      if (next.phase !== 'caption') return fail('Voting has started.');
      if (next.submissions[playerId] !== undefined) return fail('You already submitted.');
      const text = move.text.trim().slice(0, 140);
      if (!text) return fail('Write something!');
      next.submissions[playerId] = text;
      if (next.players.every((p) => next.submissions[p] !== undefined)) {
        next.roundCaptions = shuffle(next.players.map((p) => ({ author: p, text: next.submissions[p]! })), next.rng).result;
        next.rng = shuffle([0], next.rng).seed;
        next.phase = 'vote';
        next.submissions = {};
      }
      return ok(next);
    }

    // vote
    if (next.phase !== 'vote') return fail('It is not voting time.');
    if (next.roundVotes[playerId] !== undefined) return fail('You already voted.');
    const cap = next.roundCaptions[move.captionIndex];
    if (!cap) return fail('Invalid choice.');
    if (cap.author === playerId) return fail('You can’t vote for your own caption.');
    next.roundVotes[playerId] = move.captionIndex;
    if (next.players.every((p) => next.roundVotes[p] !== undefined)) {
      for (const idx of Object.values(next.roundVotes)) {
        const author = next.roundCaptions[idx]!.author;
        next.scores[author] = (next.scores[author] ?? 0) + 1;
      }
      next.round += 1;
      if (next.round >= next.totalRounds) next.finished = true;
      else { next.phase = 'caption'; next.roundCaptions = []; next.roundVotes = {}; }
    }
    return ok(next);
  },

  getResult(state): GameResult | null {
    if (!state.finished) return null;
    let winner: string | null = null, top = -1, tie = false;
    for (const p of state.players) {
      const s = state.scores[p] ?? 0;
      if (s > top) { top = s; winner = p; tie = false; }
      else if (s === top) tie = true;
    }
    return { winnerId: tie ? null : winner, draw: tie, scores: state.scores, reason: 'Funniest of the night' };
  },

  // Hide others' captions while writing; anonymise authors while voting.
  viewFor(state, viewer) {
    const v = clone(state);
    if (state.phase === 'caption') {
      v.submissions = viewer && state.submissions[viewer] !== undefined ? { [viewer]: state.submissions[viewer]! } : {};
    } else {
      v.roundCaptions = state.roundCaptions.map((c) => ({ author: c.author === viewer ? c.author : '', text: c.text }));
      v.roundVotes = {};
    }
    return v;
  },
};
