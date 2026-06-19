import type { GameMeta } from '../types.js';
import { makeQuizEngine, type QuizQuestion } from './quiz-engine.js';

export const teamQuizMeta: GameMeta = {
  id: 'team-quiz',
  name: 'Team Quiz Battle',
  category: 'OFFICE',
  minPlayers: 1,
  maxPlayers: 30,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Mixed-bag trivia to settle who really knows their stuff.',
  status: 'live',
};

const QUESTIONS: QuizQuestion[] = [
  { q: 'Who painted the Mona Lisa?', options: ['Van Gogh', 'Picasso', 'Da Vinci', 'Monet'], answer: 2, category: 'Art' },
  { q: 'In which country are the Pyramids of Giza?', options: ['Mexico', 'Egypt', 'Peru', 'Iraq'], answer: 1, category: 'History' },
  { q: 'What is the chemical symbol for gold?', options: ['Go', 'Gd', 'Au', 'Ag'], answer: 2, category: 'Science' },
  { q: 'Which company makes the iPhone?', options: ['Google', 'Samsung', 'Apple', 'Sony'], answer: 2, category: 'Tech' },
  { q: 'How many players are on a football (soccer) team?', options: ['9', '10', '11', '12'], answer: 2, category: 'Sport' },
  { q: 'What currency is used in Japan?', options: ['Won', 'Yuan', 'Yen', 'Baht'], answer: 2, category: 'GK' },
  { q: 'Who wrote "Romeo and Juliet"?', options: ['Dickens', 'Shakespeare', 'Tolstoy', 'Austen'], answer: 1, category: 'Literature' },
  { q: 'What is the hardest natural substance?', options: ['Gold', 'Iron', 'Diamond', 'Quartz'], answer: 2, category: 'Science' },
  { q: 'Which planet is closest to the Sun?', options: ['Venus', 'Mercury', 'Mars', 'Earth'], answer: 1, category: 'Science' },
  { q: 'In what year did World War II end?', options: ['1943', '1945', '1948', '1950'], answer: 1, category: 'History' },
  { q: 'What does "WWW" stand for?', options: ['World Wide Web', 'Web World Wide', 'Wide World Web', 'World Web Wide'], answer: 0, category: 'Tech' },
  { q: 'Which animal is known as the King of the Jungle?', options: ['Tiger', 'Lion', 'Elephant', 'Leopard'], answer: 1, category: 'Nature' },
];

export const teamQuiz = makeQuizEngine(teamQuizMeta, QUESTIONS);
