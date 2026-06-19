import type { GameMeta } from '../types.js';
import { makeQuizEngine, type QuizQuestion } from './quiz-engine.js';

export const geographyChallengeMeta: GameMeta = {
  id: 'geography-challenge',
  name: 'Geography Challenge',
  category: 'EDUCATIONAL',
  minPlayers: 1,
  maxPlayers: 12,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'How well do you know the world (and Nepal)?',
  status: 'live',
};

const QUESTIONS: QuizQuestion[] = [
  { q: 'What is the capital of Japan?', options: ['Seoul', 'Beijing', 'Tokyo', 'Bangkok'], answer: 2, category: 'World' },
  { q: 'Which is the longest river in the world?', options: ['Amazon', 'Nile', 'Yangtze', 'Ganges'], answer: 1, category: 'World' },
  { q: 'Mount Everest lies on the border of Nepal and…', options: ['India', 'China (Tibet)', 'Bhutan', 'Pakistan'], answer: 1, category: 'Nepal' },
  { q: 'Which continent is the Sahara Desert in?', options: ['Asia', 'Australia', 'Africa', 'South America'], answer: 2, category: 'World' },
  { q: 'The Pokhara valley is famous for which lake?', options: ['Rara', 'Phewa', 'Tilicho', 'Begnas'], answer: 1, category: 'Nepal' },
  { q: 'Which country has the most natural lakes?', options: ['Canada', 'Russia', 'USA', 'Finland'], answer: 0, category: 'World' },
  { q: 'What is the smallest country in the world?', options: ['Monaco', 'Nauru', 'Vatican City', 'Maldives'], answer: 2, category: 'World' },
  { q: 'Kathmandu lies in which river valley?', options: ['Koshi', 'Gandaki', 'Bagmati', 'Karnali'], answer: 2, category: 'Nepal' },
  { q: 'Which line divides Earth into Northern and Southern hemispheres?', options: ['Prime Meridian', 'Equator', 'Tropic of Cancer', 'Arctic Circle'], answer: 1, category: 'World' },
  { q: 'The Great Barrier Reef is off the coast of…', options: ['Brazil', 'Australia', 'India', 'Mexico'], answer: 1, category: 'World' },
  { q: 'How many countries does Nepal border?', options: ['1', '2', '3', '4'], answer: 1, category: 'Nepal' },
  { q: 'Which is the largest ocean?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], answer: 3, category: 'World' },
];

export const geographyChallenge = makeQuizEngine(geographyChallengeMeta, QUESTIONS);
