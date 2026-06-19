import type { GameMeta } from '../types.js';
import { GUESS_WORDS, makeWordGuess } from './word-guess.js';

export const charadesMeta: GameMeta = {
  id: 'charades',
  name: 'Charades',
  category: 'PARTY',
  minPlayers: 2,
  maxPlayers: 16,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Act out the word on your screen — no talking!',
  status: 'live',
};

// The actor sees the word and acts it out.
export const charades = makeWordGuess(charadesMeta, GUESS_WORDS, true);

export const headsUpMeta: GameMeta = {
  id: 'heads-up',
  name: 'Heads Up',
  category: 'PARTY',
  minPlayers: 2,
  maxPlayers: 16,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'You can’t see your word — everyone else gives you clues!',
  status: 'live',
};

// The holder does NOT see the word; everyone else does and gives clues.
export const headsUp = makeWordGuess(headsUpMeta, GUESS_WORDS, false);
