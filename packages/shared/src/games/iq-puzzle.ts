import type { GameMeta } from '../types.js';
import { makeQuizEngine, type QuizQuestion } from './quiz-engine.js';

export const iqPuzzleMeta: GameMeta = {
  id: 'iq-puzzle',
  name: 'IQ Puzzle',
  category: 'EDUCATIONAL',
  minPlayers: 1,
  maxPlayers: 12,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Patterns, logic and lateral-thinking brain teasers.',
  status: 'live',
};

const QUESTIONS: QuizQuestion[] = [
  { q: 'What comes next? 2, 4, 8, 16, …', options: ['18', '24', '32', '20'], answer: 2, category: 'Sequence' },
  { q: 'Odd one out: 3, 5, 7, 9, 11', options: ['3', '9', '7', '11'], answer: 1, category: 'Logic' },
  { q: 'If CAT = 3, DOG = 3, BIRD = 4, then FISH = ?', options: ['3', '4', '5', '6'], answer: 1, category: 'Logic' },
  { q: 'Complete: 1, 1, 2, 3, 5, 8, …', options: ['11', '12', '13', '10'], answer: 2, category: 'Sequence' },
  { q: 'A is taller than B. C is shorter than B. Who is tallest?', options: ['A', 'B', 'C', 'Cannot tell'], answer: 0, category: 'Logic' },
  { q: 'What number is half of one quarter of 200?', options: ['25', '50', '12.5', '100'], answer: 0, category: 'Math' },
  { q: 'Next in pattern: O, T, T, F, F, S, S, …', options: ['E', 'N', 'T', 'S'], answer: 0, category: 'Pattern' },
  { q: '5 machines make 5 widgets in 5 minutes. How long for 100 machines to make 100 widgets?', options: ['100 min', '5 min', '20 min', '1 min'], answer: 1, category: 'Logic' },
  { q: 'Which shape has the most sides? Pentagon, Hexagon, Square, Triangle', options: ['Pentagon', 'Hexagon', 'Square', 'Triangle'], answer: 1, category: 'Math' },
  { q: '21, 18, 15, 12, …', options: ['10', '9', '8', '11'], answer: 1, category: 'Sequence' },
  { q: 'If you rearrange "LISTEN" you get?', options: ['SILENT', 'TINSEL', 'ENLIST', 'All of these'], answer: 3, category: 'Word' },
  { q: 'A clock shows 3:00. What is the angle between the hands?', options: ['45°', '90°', '120°', '180°'], answer: 1, category: 'Math' },
];

export const iqPuzzle = makeQuizEngine(iqPuzzleMeta, QUESTIONS);
