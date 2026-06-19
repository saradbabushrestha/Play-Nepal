import type { GameMeta } from '../types.js';
import { makeQuizEngine, type QuizQuestion } from './quiz-engine.js';

export const codingQuizMeta: GameMeta = {
  id: 'coding-quiz',
  name: 'Coding Quiz',
  category: 'EDUCATIONAL',
  minPlayers: 1,
  maxPlayers: 12,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Test your programming knowledge against the clock.',
  status: 'live',
};

const QUESTIONS: QuizQuestion[] = [
  { q: 'Which keyword declares a block-scoped variable in JavaScript?', options: ['var', 'let', 'def', 'static'], answer: 1, category: 'JS' },
  { q: 'What does HTML stand for?', options: ['Hyper Trainer Marking Language', 'HyperText Markup Language', 'HyperText Machine Language', 'High Text Markup Language'], answer: 1, category: 'Web' },
  { q: 'Big-O time complexity of binary search?', options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'], answer: 1, category: 'CS' },
  { q: 'Which is NOT a primitive type in JavaScript?', options: ['number', 'string', 'object', 'boolean'], answer: 2, category: 'JS' },
  { q: 'In Git, which command stages all changes?', options: ['git add .', 'git commit', 'git push', 'git stage'], answer: 0, category: 'Tools' },
  { q: 'What does SQL stand for?', options: ['Structured Query Language', 'Simple Query Language', 'Sequential Query Logic', 'Standard Query Layer'], answer: 0, category: 'DB' },
  { q: 'Which data structure uses LIFO order?', options: ['Queue', 'Stack', 'Heap', 'Tree'], answer: 1, category: 'CS' },
  { q: 'What is the result of typeof null in JavaScript?', options: ['"null"', '"undefined"', '"object"', '"number"'], answer: 2, category: 'JS' },
  { q: 'Which HTTP method is idempotent and used to fetch data?', options: ['POST', 'GET', 'PATCH', 'DELETE'], answer: 1, category: 'Web' },
  { q: 'React state should be updated with…', options: ['direct mutation', 'the setState/updater function', 'a global variable', 'document.write'], answer: 1, category: 'React' },
  { q: 'Which language runs natively in the browser?', options: ['Python', 'Java', 'JavaScript', 'C++'], answer: 2, category: 'Web' },
  { q: 'A "404" HTTP status means…', options: ['Server Error', 'Not Found', 'Unauthorized', 'OK'], answer: 1, category: 'Web' },
];

export const codingQuiz = makeQuizEngine(codingQuizMeta, QUESTIONS);
