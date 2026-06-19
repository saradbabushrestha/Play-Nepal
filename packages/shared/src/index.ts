// Public surface of @play-nepal/shared — imported by both server and web.
export * from './types.js';
export * from './socket-events.js';
export * from './catalog.js';

// Game engine framework + concrete engines
export * from './games/engine.js';
export * from './games/registry.js';
export type { TicTacToeState, TicTacToeMove, Mark } from './games/tic-tac-toe.js';
export { ticTacToeMeta } from './games/tic-tac-toe.js';
export type { Connect4State, Connect4Move, Disc } from './games/connect4.js';
export { connect4Meta, COLS as CONNECT4_COLS, ROWS as CONNECT4_ROWS } from './games/connect4.js';
export type { BaghchalState, BaghchalMove, Piece, Side, Phase } from './games/baghchal.js';
export { baghchalMeta, NEIGHBORS as BAGHCHAL_NEIGHBORS, TIGER_START, GOATS_TOTAL, GOATS_TO_LOSE } from './games/baghchal.js';

// Wave 2 games
export * from './games/rng.js';
export type { CheckersState, CheckersMove } from './games/checkers.js';
export { checkersMeta } from './games/checkers.js';
export type { ReversiState, ReversiMove, Disc as ReversiDisc } from './games/reversi.js';
export { reversiMeta } from './games/reversi.js';
export type { GomokuState, GomokuMove, Stone } from './games/gomoku.js';
export { gomokuMeta, SIZE as GOMOKU_SIZE } from './games/gomoku.js';
export type { DotsState, DotsMove, EdgeType } from './games/dots-and-boxes.js';
export { dotsAndBoxesMeta, BOXES as DOTS_BOXES } from './games/dots-and-boxes.js';
export type { SnakesState, SnakesMove } from './games/snakes-ladders.js';
export { snakesLaddersMeta, SNAKES, LADDERS } from './games/snakes-ladders.js';
export type { LudoState, LudoMove } from './games/ludo.js';
export { ludoMeta, ENTRIES as LUDO_ENTRIES, SAFE_SQUARES as LUDO_SAFE, HOME as LUDO_HOME, globalOf as ludoGlobalOf } from './games/ludo.js';
export type { Game2048State, Game2048Move, Dir as Game2048Dir } from './games/game2048.js';
export { game2048Meta } from './games/game2048.js';
export type { MemoryState, MemoryMove } from './games/memory-match.js';
export { memoryMatchMeta, PAIRS as MEMORY_PAIRS } from './games/memory-match.js';
export type { QuizState, QuizMove, Question } from './games/nepali-quiz.js';
export { nepaliQuizMeta, ROUNDS as QUIZ_ROUNDS } from './games/nepali-quiz.js';
export type { MathState, MathMove, Problem } from './games/math-challenge.js';
export { mathChallengeMeta, MATH_ROUNDS } from './games/math-challenge.js';

// Wave 3 games
export type { ChessState, ChessMove, Piece as ChessPiece, PieceType, Color as ChessColor } from './games/chess.js';
export { chessMeta } from './games/chess.js';
export type { MinesweeperState, MinesweeperMove } from './games/minesweeper.js';
export { minesweeperMeta, MS_W, MS_H, MS_MINES } from './games/minesweeper.js';
export type { SudokuState, SudokuMove } from './games/sudoku.js';
export { sudokuMeta } from './games/sudoku.js';
export type { NumberPuzzleState, NumberPuzzleMove } from './games/number-puzzle.js';
export { numberPuzzleMeta, NP_N } from './games/number-puzzle.js';
export type { MemoryChallengeState, MemoryChallengeMove } from './games/memory-challenge.js';
export { memoryChallengeMeta, MC_COLORS, MC_MAX } from './games/memory-challenge.js';
export type { ReactionState, ReactionMove } from './games/reaction-speed.js';
export { reactionSpeedMeta, RS_ROUNDS, RS_PENALTY } from './games/reaction-speed.js';

// Wave 4 games
export type { QuizQuestion, GenericQuizState, GenericQuizMove } from './games/quiz-engine.js';
export { makeQuizEngine } from './games/quiz-engine.js';
export { codingQuizMeta } from './games/coding-quiz.js';
export { geographyChallengeMeta } from './games/geography-challenge.js';
export { vocabularyBattleMeta } from './games/vocabulary-battle.js';
export type { LangurBurjaState, LangurBurjaMove } from './games/langur-burja.js';
export { langurBurjaMeta, LB_SYMBOLS, LB_START_POINTS } from './games/langur-burja.js';
export type { SpinWheelState, SpinWheelMove } from './games/spin-the-wheel.js';
export { spinTheWheelMeta } from './games/spin-the-wheel.js';
export type { WouldYouRatherState, WouldYouRatherMove, WYRPrompt } from './games/would-you-rather.js';
export { wouldYouRatherMeta } from './games/would-you-rather.js';
export type { WordSearchState, WordSearchMove, PlacedWord } from './games/word-search.js';
export { wordSearchMeta, WS_SIZE } from './games/word-search.js';
export type { ClickSpeedState, ClickSpeedMove } from './games/click-speed.js';
export { clickSpeedMeta, CS_DURATION_MS } from './games/click-speed.js';

// Wave 5 games
export { guessTheMovieMeta } from './games/guess-the-movie.js';
export { guessTheSongMeta } from './games/guess-the-song.js';
export { iqPuzzleMeta } from './games/iq-puzzle.js';
export { rapidFireMeta } from './games/rapid-fire.js';
export { teamQuizMeta } from './games/team-quiz.js';
export type { TruthOrDareState, TruthOrDareMove } from './games/truth-or-dare.js';
export { truthOrDareMeta } from './games/truth-or-dare.js';
export type { IcebreakerState, IcebreakerMove } from './games/icebreaker.js';
export { icebreakerMeta } from './games/icebreaker.js';
export type { MostLikelyState, MostLikelyMove } from './games/most-likely-to.js';
export { mostLikelyToMeta } from './games/most-likely-to.js';
export type { TypingRaceState, TypingRaceMove, TypingResult } from './games/typing-race.js';
export { typingRaceMeta } from './games/typing-race.js';
export type { BingoState, BingoMove } from './games/virtual-bingo.js';
export { virtualBingoMeta } from './games/virtual-bingo.js';
export type { SocialDeductionState, SDMove, SDRole, SDLabels } from './games/social-deduction.js';
export { mafiaMeta, werewolfMeta } from './games/mafia.js';
export type { WordGuessState, WordGuessMove } from './games/word-guess.js';
export { charadesMeta, headsUpMeta } from './games/charades.js';

// Wave 6 games (final five)
export type { MemeBattleState, MemeBattleMove } from './games/meme-battle.js';
export { memeBattleMeta } from './games/meme-battle.js';
export type { GuessEmployeeState, GuessEmployeeMove } from './games/guess-the-employee.js';
export { guessTheEmployeeMeta } from './games/guess-the-employee.js';
export type { GattiState, GattiMove } from './games/gatti.js';
export { gattiMeta, GATTI_MAX_LEVEL, GATTI_LIVES } from './games/gatti.js';
export type { DrawAndGuessState, DrawAndGuessMove, DrawGuess } from './games/draw-and-guess.js';
export { drawAndGuessMeta } from './games/draw-and-guess.js';
export type { CarromState, CarromMove, CarromCoin, CarromFrame, CoinType } from './games/carrom.js';
export { carromMeta, COIN_R, STRIKER_R } from './games/carrom.js';
