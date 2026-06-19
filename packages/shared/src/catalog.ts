import type { GameMeta } from './types.js';
import { baghchalMeta } from './games/baghchal.js';
import { connect4Meta } from './games/connect4.js';
import { ticTacToeMeta } from './games/tic-tac-toe.js';
import { checkersMeta } from './games/checkers.js';
import { reversiMeta } from './games/reversi.js';
import { gomokuMeta } from './games/gomoku.js';
import { dotsAndBoxesMeta } from './games/dots-and-boxes.js';
import { snakesLaddersMeta } from './games/snakes-ladders.js';
import { ludoMeta } from './games/ludo.js';
import { game2048Meta } from './games/game2048.js';
import { memoryMatchMeta } from './games/memory-match.js';
import { nepaliQuizMeta } from './games/nepali-quiz.js';
import { mathChallengeMeta } from './games/math-challenge.js';
import { chessMeta } from './games/chess.js';
import { minesweeperMeta } from './games/minesweeper.js';
import { sudokuMeta } from './games/sudoku.js';
import { numberPuzzleMeta } from './games/number-puzzle.js';
import { memoryChallengeMeta } from './games/memory-challenge.js';
import { reactionSpeedMeta } from './games/reaction-speed.js';
import { codingQuizMeta } from './games/coding-quiz.js';
import { geographyChallengeMeta } from './games/geography-challenge.js';
import { vocabularyBattleMeta } from './games/vocabulary-battle.js';
import { langurBurjaMeta } from './games/langur-burja.js';
import { spinTheWheelMeta } from './games/spin-the-wheel.js';
import { wouldYouRatherMeta } from './games/would-you-rather.js';
import { wordSearchMeta } from './games/word-search.js';
import { clickSpeedMeta } from './games/click-speed.js';
import { guessTheMovieMeta } from './games/guess-the-movie.js';
import { guessTheSongMeta } from './games/guess-the-song.js';
import { iqPuzzleMeta } from './games/iq-puzzle.js';
import { rapidFireMeta } from './games/rapid-fire.js';
import { teamQuizMeta } from './games/team-quiz.js';
import { truthOrDareMeta } from './games/truth-or-dare.js';
import { icebreakerMeta } from './games/icebreaker.js';
import { mostLikelyToMeta } from './games/most-likely-to.js';
import { typingRaceMeta } from './games/typing-race.js';
import { virtualBingoMeta } from './games/virtual-bingo.js';
import { mafiaMeta, werewolfMeta } from './games/mafia.js';
import { charadesMeta, headsUpMeta } from './games/charades.js';
import { memeBattleMeta } from './games/meme-battle.js';
import { guessTheEmployeeMeta } from './games/guess-the-employee.js';
import { gattiMeta } from './games/gatti.js';
import { drawAndGuessMeta } from './games/draw-and-guess.js';
import { carromMeta } from './games/carrom.js';

/**
 * The full Play Nepal catalogue — every game is now `live` and playable.
 * This list seeds the database and powers the lobby's "Browse Games" grid.
 */
export const GAME_CATALOG: GameMeta[] = [
  // ── Nepali traditional ──
  baghchalMeta,
  nepaliQuizMeta,
  langurBurjaMeta,
  gattiMeta,

  // ── Board ──
  ticTacToeMeta,
  connect4Meta,
  checkersMeta,
  reversiMeta,
  gomokuMeta,
  dotsAndBoxesMeta,
  ludoMeta,
  snakesLaddersMeta,
  chessMeta,
  carromMeta,

  // ── Office team building ──
  spinTheWheelMeta,
  truthOrDareMeta,
  mostLikelyToMeta,
  icebreakerMeta,
  teamQuizMeta,
  rapidFireMeta,
  virtualBingoMeta,
  guessTheEmployeeMeta,

  // ── Party ──
  wouldYouRatherMeta,
  mafiaMeta,
  werewolfMeta,
  charadesMeta,
  headsUpMeta,
  guessTheMovieMeta,
  guessTheSongMeta,
  memeBattleMeta,
  drawAndGuessMeta,

  // ── Educational ──
  mathChallengeMeta,
  memoryChallengeMeta,
  codingQuizMeta,
  geographyChallengeMeta,
  vocabularyBattleMeta,
  typingRaceMeta,
  iqPuzzleMeta,

  // ── Casual ──
  game2048Meta,
  memoryMatchMeta,
  minesweeperMeta,
  sudokuMeta,
  numberPuzzleMeta,
  reactionSpeedMeta,
  wordSearchMeta,
  clickSpeedMeta,
];

export const CATEGORY_LABELS: Record<GameMeta['category'], string> = {
  NEPALI_TRADITIONAL: 'Nepali Traditional',
  BOARD: 'Board Games',
  OFFICE: 'Office Team Building',
  PARTY: 'Party Games',
  EDUCATIONAL: 'Educational',
  CASUAL: 'Casual',
};
