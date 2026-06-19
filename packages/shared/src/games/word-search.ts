import type { GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';
import { nextRng, seedFromOptions } from './rng.js';

// ─────────────────────────────────────────────────────────────
// Word Search — single-player. Seeded grid with hidden words placed
// in 8 directions; select a straight line of cells to find a word.
// ─────────────────────────────────────────────────────────────

export const WS_SIZE = 10;
const WORD_POOL = ['NEPAL', 'TIGER', 'EVEREST', 'MOMO', 'RIVER', 'TEMPLE', 'YAK', 'DAL', 'LAKE', 'PEAK', 'TEA', 'RICE'];
const DIRS: Array<[number, number]> = [[0, 1], [1, 0], [1, 1], [1, -1], [0, -1], [-1, 0], [-1, -1], [-1, 1]];

export interface PlacedWord { word: string; cells: number[] }

export interface WordSearchState {
  size: number;
  grid: string[];
  words: PlacedWord[];
  found: number[]; // indices into `words`
  player: string;
}

export interface WordSearchMove {
  cells: number[];
}

export const wordSearchMeta: GameMeta = {
  id: 'word-search',
  name: 'Word Search',
  category: 'CASUAL',
  minPlayers: 1,
  maxPlayers: 1,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Find the hidden words tucked inside the letter grid.',
  status: 'live',
};

function generate(seed: number): { grid: string[]; words: PlacedWord[] } {
  const N = WS_SIZE;
  const grid: (string | null)[] = Array(N * N).fill(null);
  const words: PlacedWord[] = [];
  let s = seed;
  const rnd = (max: number) => { const r = nextRng(s); s = r.seed; return Math.floor(r.value * max); };

  for (const word of WORD_POOL) {
    if (words.length >= 8) break;
    let placed = false;
    for (let attempt = 0; attempt < 80 && !placed; attempt++) {
      const [dr, dc] = DIRS[rnd(DIRS.length)]!;
      const r0 = rnd(N), c0 = rnd(N);
      const cells: number[] = [];
      let okFit = true;
      for (let k = 0; k < word.length; k++) {
        const r = r0 + dr * k, c = c0 + dc * k;
        if (r < 0 || r >= N || c < 0 || c >= N) { okFit = false; break; }
        const idx = r * N + c;
        const existing = grid[idx];
        if (existing !== null && existing !== word[k]) { okFit = false; break; }
        cells.push(idx);
      }
      if (!okFit) continue;
      cells.forEach((idx, k) => { grid[idx] = word[k]!; });
      words.push({ word, cells });
      placed = true;
    }
  }
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const filled = grid.map((ch) => ch ?? letters[rnd(26)]!);
  return { grid: filled, words };
}

const sameCells = (a: number[], b: number[]) => {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y), sb = [...b].sort((x, y) => x - y);
  return sa.every((v, i) => v === sb[i]);
};

export const wordSearch: GameEngine<WordSearchState, WordSearchMove> = {
  meta: wordSearchMeta,

  createInitialState(players: PlayerSlot[], options): WordSearchState {
    const { grid, words } = generate(seedFromOptions(options));
    return { size: WS_SIZE, grid, words, found: [], player: players[0]?.playerId ?? 'seat-0' };
  },

  currentTurn(state) {
    return state.found.length >= state.words.length ? null : state.player;
  },

  legalMoves() {
    return []; // continuous selection space; validated in applyMove
  },

  applyMove(state, move, playerId): MoveResult<WordSearchState> {
    if (state.player !== playerId) return fail('Not your puzzle.');
    if (state.found.length >= state.words.length) return fail('Puzzle complete.');
    const wi = state.words.findIndex((w, i) => !state.found.includes(i) && sameCells(w.cells, move.cells));
    if (wi < 0) return fail('Not a word.');
    const next = clone(state);
    next.found.push(wi);
    return ok(next);
  },

  getResult(state): GameResult | null {
    if (state.found.length < state.words.length) return null;
    return { winnerId: state.player, draw: false, reason: 'All words found!' };
  },
};
