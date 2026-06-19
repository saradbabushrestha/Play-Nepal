import type { GameMeta } from '../types.js';
import { makeQuizEngine, type QuizQuestion } from './quiz-engine.js';

export const vocabularyBattleMeta: GameMeta = {
  id: 'vocabulary-battle',
  name: 'Vocabulary Battle',
  category: 'EDUCATIONAL',
  minPlayers: 1,
  maxPlayers: 12,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Pick the right meaning — sharpen your word power.',
  status: 'live',
};

const QUESTIONS: QuizQuestion[] = [
  { q: 'What does "benevolent" mean?', options: ['Cruel', 'Kind and generous', 'Confused', 'Wealthy'], answer: 1, category: 'Meaning' },
  { q: 'A synonym for "abundant" is…', options: ['Scarce', 'Plentiful', 'Tiny', 'Heavy'], answer: 1, category: 'Synonym' },
  { q: '"Ephemeral" describes something that is…', options: ['Eternal', 'Short-lived', 'Enormous', 'Hidden'], answer: 1, category: 'Meaning' },
  { q: 'The opposite of "candid" is…', options: ['Honest', 'Secretive', 'Bright', 'Cheerful'], answer: 1, category: 'Antonym' },
  { q: 'What does "meticulous" mean?', options: ['Careless', 'Very careful and precise', 'Lazy', 'Loud'], answer: 1, category: 'Meaning' },
  { q: 'A "gregarious" person is…', options: ['Shy', 'Sociable', 'Angry', 'Forgetful'], answer: 1, category: 'Meaning' },
  { q: 'Choose the synonym for "rapid".', options: ['Slow', 'Swift', 'Quiet', 'Round'], answer: 1, category: 'Synonym' },
  { q: '"Frugal" means…', options: ['Wasteful', 'Economical', 'Fragile', 'Frozen'], answer: 1, category: 'Meaning' },
  { q: 'The antonym of "ascend" is…', options: ['Climb', 'Descend', 'Rise', 'Soar'], answer: 1, category: 'Antonym' },
  { q: 'What does "verbose" mean?', options: ['Using too many words', 'Silent', 'Truthful', 'Green'], answer: 0, category: 'Meaning' },
  { q: 'A synonym for "courage" is…', options: ['Fear', 'Bravery', 'Doubt', 'Calm'], answer: 1, category: 'Synonym' },
  { q: '"Diligent" means…', options: ['Hardworking', 'Sleepy', 'Rude', 'Rich'], answer: 0, category: 'Meaning' },
];

export const vocabularyBattle = makeQuizEngine(vocabularyBattleMeta, QUESTIONS);
