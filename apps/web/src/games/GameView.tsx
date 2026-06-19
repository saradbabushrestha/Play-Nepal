import type { ReactElement } from 'react';
import { Baghchal } from './Baghchal';
import { Connect4 } from './Connect4';
import { TicTacToe } from './TicTacToe';
import { Checkers } from './Checkers';
import { Reversi } from './Reversi';
import { Gomoku } from './Gomoku';
import { DotsAndBoxes } from './DotsAndBoxes';
import { SnakesLadders } from './SnakesLadders';
import { Ludo } from './Ludo';
import { Game2048 } from './Game2048';
import { MemoryMatch } from './MemoryMatch';
import { NepaliQuiz } from './NepaliQuiz';
import { MathChallenge } from './MathChallenge';
import { Chess } from './Chess';
import { Minesweeper } from './Minesweeper';
import { Sudoku } from './Sudoku';
import { NumberPuzzle } from './NumberPuzzle';
import { MemoryChallenge } from './MemoryChallenge';
import { ReactionSpeed } from './ReactionSpeed';
import { LangurBurja } from './LangurBurja';
import { SpinWheel } from './SpinWheel';
import { WouldYouRather } from './WouldYouRather';
import { WordSearch } from './WordSearch';
import { ClickSpeed } from './ClickSpeed';
import { TruthOrDare } from './TruthOrDare';
import { Icebreaker } from './Icebreaker';
import { MostLikelyTo } from './MostLikelyTo';
import { TypingRace } from './TypingRace';
import { VirtualBingo } from './VirtualBingo';
import { SocialDeduction } from './SocialDeduction';
import { WordGuess } from './WordGuess';
import { MemeBattle } from './MemeBattle';
import { GuessTheEmployee } from './GuessTheEmployee';
import { Gatti } from './Gatti';
import { DrawAndGuess } from './DrawAndGuess';
import { Carrom } from './Carrom';
import type { GameBoardProps } from './types';

const BOARDS: Record<string, (props: GameBoardProps) => ReactElement> = {
  'tic-tac-toe': TicTacToe,
  'connect-4': Connect4,
  baghchal: Baghchal,
  checkers: Checkers,
  reversi: Reversi,
  gomoku: Gomoku,
  'dots-and-boxes': DotsAndBoxes,
  'snakes-ladders': SnakesLadders,
  ludo: Ludo,
  '2048': Game2048,
  'memory-match': MemoryMatch,
  'nepali-quiz': NepaliQuiz,
  'math-challenge': MathChallenge,
  chess: Chess,
  minesweeper: Minesweeper,
  sudoku: Sudoku,
  'number-puzzle': NumberPuzzle,
  'memory-challenge': MemoryChallenge,
  'reaction-speed': ReactionSpeed,
  // quiz games share the NepaliQuiz board (same state shape)
  'coding-quiz': NepaliQuiz,
  'geography-challenge': NepaliQuiz,
  'vocabulary-battle': NepaliQuiz,
  'guess-the-movie': NepaliQuiz,
  'guess-the-song': NepaliQuiz,
  'iq-puzzle': NepaliQuiz,
  'rapid-fire': NepaliQuiz,
  'team-quiz': NepaliQuiz,
  'truth-or-dare': TruthOrDare,
  icebreaker: Icebreaker,
  'most-likely-to': MostLikelyTo,
  'typing-race': TypingRace,
  'virtual-bingo': VirtualBingo,
  mafia: SocialDeduction,
  werewolf: SocialDeduction,
  charades: WordGuess,
  'heads-up': WordGuess,
  'meme-battle': MemeBattle,
  'guess-the-employee': GuessTheEmployee,
  gatti: Gatti,
  'draw-and-guess': DrawAndGuess,
  carrom: Carrom,
  'langur-burja': LangurBurja,
  'spin-the-wheel': SpinWheel,
  'would-you-rather': WouldYouRather,
  'word-search': WordSearch,
  'click-speed': ClickSpeed,
};

export function GameView({ gameId, ...props }: GameBoardProps & { gameId: string }) {
  const Board = BOARDS[gameId];
  if (!Board) {
    return (
      <div className="grid place-items-center rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
        This game’s board UI is coming soon.
      </div>
    );
  }
  // CSS keyframe entrance (a stuck framer opacity tween could hide the board).
  return (
    <div key={gameId} className="animate-fade-up">
      <Board {...props} />
    </div>
  );
}
