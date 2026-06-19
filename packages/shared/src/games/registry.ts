import type { GameEngine } from './engine.js';
import { baghchal } from './baghchal.js';
import { connect4 } from './connect4.js';
import { ticTacToe } from './tic-tac-toe.js';
import { checkers } from './checkers.js';
import { reversi } from './reversi.js';
import { gomoku } from './gomoku.js';
import { dotsAndBoxes } from './dots-and-boxes.js';
import { snakesLadders } from './snakes-ladders.js';
import { ludo } from './ludo.js';
import { game2048 } from './game2048.js';
import { memoryMatch } from './memory-match.js';
import { nepaliQuiz } from './nepali-quiz.js';
import { mathChallenge } from './math-challenge.js';
import { chess } from './chess.js';
import { minesweeper } from './minesweeper.js';
import { sudoku } from './sudoku.js';
import { numberPuzzle } from './number-puzzle.js';
import { memoryChallenge } from './memory-challenge.js';
import { reactionSpeed } from './reaction-speed.js';
import { codingQuiz } from './coding-quiz.js';
import { geographyChallenge } from './geography-challenge.js';
import { vocabularyBattle } from './vocabulary-battle.js';
import { langurBurja } from './langur-burja.js';
import { spinTheWheel } from './spin-the-wheel.js';
import { wouldYouRather } from './would-you-rather.js';
import { wordSearch } from './word-search.js';
import { clickSpeed } from './click-speed.js';
import { guessTheMovie } from './guess-the-movie.js';
import { guessTheSong } from './guess-the-song.js';
import { iqPuzzle } from './iq-puzzle.js';
import { rapidFire } from './rapid-fire.js';
import { teamQuiz } from './team-quiz.js';
import { truthOrDare } from './truth-or-dare.js';
import { icebreaker } from './icebreaker.js';
import { mostLikelyTo } from './most-likely-to.js';
import { typingRace } from './typing-race.js';
import { virtualBingo } from './virtual-bingo.js';
import { mafia, werewolf } from './mafia.js';
import { charades, headsUp } from './charades.js';
import { memeBattle } from './meme-battle.js';
import { guessTheEmployee } from './guess-the-employee.js';
import { gatti } from './gatti.js';
import { drawAndGuess } from './draw-and-guess.js';
import { carrom } from './carrom.js';

/**
 * The live engine registry. Adding a new playable game = implement the
 * GameEngine interface and register it here; the room/socket layer and the
 * AI runner pick it up automatically.
 */
export const ENGINES: Record<string, GameEngine<any, any>> = {
  [ticTacToe.meta.id]: ticTacToe,
  [connect4.meta.id]: connect4,
  [baghchal.meta.id]: baghchal,
  [checkers.meta.id]: checkers,
  [reversi.meta.id]: reversi,
  [gomoku.meta.id]: gomoku,
  [dotsAndBoxes.meta.id]: dotsAndBoxes,
  [snakesLadders.meta.id]: snakesLadders,
  [ludo.meta.id]: ludo,
  [game2048.meta.id]: game2048,
  [memoryMatch.meta.id]: memoryMatch,
  [nepaliQuiz.meta.id]: nepaliQuiz,
  [mathChallenge.meta.id]: mathChallenge,
  [chess.meta.id]: chess,
  [minesweeper.meta.id]: minesweeper,
  [sudoku.meta.id]: sudoku,
  [numberPuzzle.meta.id]: numberPuzzle,
  [memoryChallenge.meta.id]: memoryChallenge,
  [reactionSpeed.meta.id]: reactionSpeed,
  [codingQuiz.meta.id]: codingQuiz,
  [geographyChallenge.meta.id]: geographyChallenge,
  [vocabularyBattle.meta.id]: vocabularyBattle,
  [langurBurja.meta.id]: langurBurja,
  [spinTheWheel.meta.id]: spinTheWheel,
  [wouldYouRather.meta.id]: wouldYouRather,
  [wordSearch.meta.id]: wordSearch,
  [clickSpeed.meta.id]: clickSpeed,
  [guessTheMovie.meta.id]: guessTheMovie,
  [guessTheSong.meta.id]: guessTheSong,
  [iqPuzzle.meta.id]: iqPuzzle,
  [rapidFire.meta.id]: rapidFire,
  [teamQuiz.meta.id]: teamQuiz,
  [truthOrDare.meta.id]: truthOrDare,
  [icebreaker.meta.id]: icebreaker,
  [mostLikelyTo.meta.id]: mostLikelyTo,
  [typingRace.meta.id]: typingRace,
  [virtualBingo.meta.id]: virtualBingo,
  [mafia.meta.id]: mafia,
  [werewolf.meta.id]: werewolf,
  [charades.meta.id]: charades,
  [headsUp.meta.id]: headsUp,
  [memeBattle.meta.id]: memeBattle,
  [guessTheEmployee.meta.id]: guessTheEmployee,
  [gatti.meta.id]: gatti,
  [drawAndGuess.meta.id]: drawAndGuess,
  [carrom.meta.id]: carrom,
};

export function getEngine(gameId: string): GameEngine<any, any> | null {
  return ENGINES[gameId] ?? null;
}

export function isLiveGame(gameId: string): boolean {
  return gameId in ENGINES;
}

export {
  ticTacToe, connect4, baghchal, checkers, reversi, gomoku, dotsAndBoxes,
  snakesLadders, ludo, game2048, memoryMatch, nepaliQuiz, mathChallenge,
  chess, minesweeper, sudoku, numberPuzzle, memoryChallenge, reactionSpeed,
  codingQuiz, geographyChallenge, vocabularyBattle, langurBurja, spinTheWheel,
  wouldYouRather, wordSearch, clickSpeed,
  guessTheMovie, guessTheSong, iqPuzzle, rapidFire, teamQuiz, truthOrDare,
  icebreaker, mostLikelyTo, typingRace, virtualBingo, mafia, werewolf, charades, headsUp,
  memeBattle, guessTheEmployee, gatti, drawAndGuess, carrom,
};
