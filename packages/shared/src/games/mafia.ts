import type { GameMeta } from '../types.js';
import { makeSocialDeduction } from './social-deduction.js';

export const mafiaMeta: GameMeta = {
  id: 'mafia',
  name: 'Mafia',
  category: 'PARTY',
  minPlayers: 4,
  maxPlayers: 16,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Find the mafia before they pick off the town, one night at a time.',
  status: 'live',
};

export const mafia = makeSocialDeduction(mafiaMeta, {
  faction: 'Mafia', protector: 'Doctor', investigator: 'Detective', civilian: 'Villager',
});

export const werewolfMeta: GameMeta = {
  id: 'werewolf',
  name: 'Werewolf',
  category: 'PARTY',
  minPlayers: 4,
  maxPlayers: 16,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Villagers hunt the werewolves before the pack devours them all.',
  status: 'live',
};

export const werewolf = makeSocialDeduction(werewolfMeta, {
  faction: 'Werewolves', protector: 'Guardian', investigator: 'Seer', civilian: 'Villager',
});
