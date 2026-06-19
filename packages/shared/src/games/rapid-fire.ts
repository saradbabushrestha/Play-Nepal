import type { GameMeta } from '../types.js';
import { makeQuizEngine, type QuizQuestion } from './quiz-engine.js';

export const rapidFireMeta: GameMeta = {
  id: 'rapid-fire',
  name: 'Rapid Fire Challenge',
  category: 'OFFICE',
  minPlayers: 1,
  maxPlayers: 20,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Quick-fire general knowledge — think fast!',
  status: 'live',
};

const QUESTIONS: QuizQuestion[] = [
  { q: 'How many continents are there?', options: ['5', '6', '7', '8'], answer: 2, category: 'GK' },
  { q: 'What is H₂O commonly known as?', options: ['Salt', 'Water', 'Oxygen', 'Acid'], answer: 1, category: 'Science' },
  { q: 'How many minutes in an hour?', options: ['30', '60', '90', '100'], answer: 1, category: 'GK' },
  { q: 'Which planet is known as the Red Planet?', options: ['Venus', 'Jupiter', 'Mars', 'Saturn'], answer: 2, category: 'Science' },
  { q: 'What colour do you get mixing blue and yellow?', options: ['Purple', 'Green', 'Orange', 'Brown'], answer: 1, category: 'GK' },
  { q: 'How many sides does a triangle have?', options: ['2', '3', '4', '5'], answer: 1, category: 'Math' },
  { q: 'What is the largest mammal?', options: ['Elephant', 'Blue Whale', 'Giraffe', 'Hippo'], answer: 1, category: 'Nature' },
  { q: 'Which gas do plants absorb from the air?', options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'], answer: 2, category: 'Science' },
  { q: 'How many days in a leap year?', options: ['364', '365', '366', '360'], answer: 2, category: 'GK' },
  { q: 'What is 9 × 9?', options: ['72', '81', '90', '99'], answer: 1, category: 'Math' },
  { q: 'Which ocean is the largest?', options: ['Atlantic', 'Indian', 'Pacific', 'Arctic'], answer: 2, category: 'Geography' },
  { q: 'What is the freezing point of water in °C?', options: ['0', '32', '100', '-10'], answer: 0, category: 'Science' },
];

export const rapidFire = makeQuizEngine(rapidFireMeta, QUESTIONS, 10);
