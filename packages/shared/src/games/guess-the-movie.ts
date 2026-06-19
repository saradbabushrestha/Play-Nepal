import type { GameMeta } from '../types.js';
import { makeQuizEngine, type QuizQuestion } from './quiz-engine.js';

export const guessTheMovieMeta: GameMeta = {
  id: 'guess-the-movie',
  name: 'Guess the Movie',
  category: 'PARTY',
  minPlayers: 1,
  maxPlayers: 16,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Name the film from a one-line clue.',
  status: 'live',
};

const QUESTIONS: QuizQuestion[] = [
  { q: 'A clownfish dad searches the ocean for his lost son.', options: ['Shark Tale', 'Finding Nemo', 'The Little Mermaid', 'Moana'], answer: 1, category: 'Animation' },
  { q: 'A young lion flees his kingdom after his father’s death.', options: ['The Jungle Book', 'Madagascar', 'The Lion King', 'Tarzan'], answer: 2, category: 'Animation' },
  { q: 'A team of superheroes assembles to stop Loki and his army.', options: ['Justice League', 'The Avengers', 'X-Men', 'Guardians of the Galaxy'], answer: 1, category: 'Action' },
  { q: 'A boy discovers he is a wizard on his 11th birthday.', options: ['Percy Jackson', 'Harry Potter', 'The Hobbit', 'Narnia'], answer: 1, category: 'Fantasy' },
  { q: 'Dinosaurs are brought back to life in a theme park.', options: ['King Kong', 'Jurassic Park', 'Godzilla', 'Jumanji'], answer: 1, category: 'Sci-Fi' },
  { q: 'A ship deemed unsinkable hits an iceberg.', options: ['Titanic', 'Poseidon', 'The Perfect Storm', 'Life of Pi'], answer: 0, category: 'Drama' },
  { q: 'Toys come to life when humans aren’t around.', options: ['The Lego Movie', 'Toy Story', 'Wreck-It Ralph', 'Cars'], answer: 1, category: 'Animation' },
  { q: 'A hobbit must destroy a powerful ring in a volcano.', options: ['Eragon', 'The Lord of the Rings', 'Willow', 'Stardust'], answer: 1, category: 'Fantasy' },
  { q: 'A street kid finds a lamp with a wish-granting genie.', options: ['Hercules', 'Aladdin', 'Sinbad', 'Prince of Persia'], answer: 1, category: 'Animation' },
  { q: 'A man relives the same day over and over.', options: ['Inception', 'Groundhog Day', 'Memento', 'Looper'], answer: 1, category: 'Comedy' },
  { q: 'Robots disguised as vehicles wage war on Earth.', options: ['Pacific Rim', 'Transformers', 'Real Steel', 'Iron Man'], answer: 1, category: 'Action' },
  { q: 'A snowman and a princess help end an eternal winter.', options: ['Frozen', 'Brave', 'Tangled', 'Encanto'], answer: 0, category: 'Animation' },
];

export const guessTheMovie = makeQuizEngine(guessTheMovieMeta, QUESTIONS);
