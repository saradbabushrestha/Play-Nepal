import type { GameMeta } from '../types.js';
import { makeQuizEngine, type QuizQuestion } from './quiz-engine.js';

export const guessTheSongMeta: GameMeta = {
  id: 'guess-the-song',
  name: 'Guess the Song',
  category: 'PARTY',
  minPlayers: 1,
  maxPlayers: 16,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Name the track from a famous lyric.',
  status: 'live',
};

const QUESTIONS: QuizQuestion[] = [
  { q: '"Is this the real life? Is this just fantasy?"', options: ['Bohemian Rhapsody', 'We Will Rock You', 'Hotel California', 'Imagine'], answer: 0, category: 'Rock' },
  { q: '"’Cause baby you’re a firework"', options: ['Roar', 'Firework', 'Diamonds', 'Titanium'], answer: 1, category: 'Pop' },
  { q: '"We don’t talk about Bruno, no no no"', options: ['Let It Go', 'We Don’t Talk About Bruno', 'How Far I’ll Go', 'Surface Pressure'], answer: 1, category: 'Soundtrack' },
  { q: '"I just wanna tell you how I’m feeling, gotta make you understand…"', options: ['Africa', 'Sweet Caroline', 'Never Gonna Give You Up', 'Take On Me'], answer: 2, category: 'Pop' },
  { q: '"Hello from the other side"', options: ['Someone Like You', 'Hello', 'Rolling in the Deep', 'Easy On Me'], answer: 1, category: 'Pop' },
  { q: '"I’m in love with the shape of you"', options: ['Perfect', 'Shape of You', 'Photograph', 'Castle on the Hill'], answer: 1, category: 'Pop' },
  { q: '"Cause I, I’m in the stars tonight"', options: ['Butter', 'Dynamite', 'Permission to Dance', 'Boy With Luv'], answer: 1, category: 'K-Pop' },
  { q: '"You may say I’m a dreamer, but I’m not the only one"', options: ['Imagine', 'Let It Be', 'Yesterday', 'Hey Jude'], answer: 0, category: 'Classic' },
  { q: '"’Cause I’m happy, clap along if you feel…"', options: ['Happy', 'Good Vibrations', 'Walking on Sunshine', 'Don’t Stop Me Now'], answer: 0, category: 'Pop' },
  { q: '"Despacito, quiero respirar tu cuello despacito"', options: ['Bailando', 'Despacito', 'Macarena', 'Gasolina'], answer: 1, category: 'Latin' },
  { q: '"And I will always love you-ou-ou"', options: ['I Will Always Love You', 'My Heart Will Go On', 'Halo', 'Listen'], answer: 0, category: 'Ballad' },
  { q: '"Wake me up before you go-go"', options: ['Last Christmas', 'Careless Whisper', 'Wake Me Up Before You Go-Go', 'Faith'], answer: 2, category: 'Retro' },
];

export const guessTheSong = makeQuizEngine(guessTheSongMeta, QUESTIONS);
