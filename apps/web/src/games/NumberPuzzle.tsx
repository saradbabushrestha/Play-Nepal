import { motion } from 'framer-motion';
import { NP_N, type NumberPuzzleState } from '@play-nepal/shared';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

const GAP = 8;

export function NumberPuzzle({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as NumberPuzzleState;
  const active = !state.solved && snapshot.turn === myPlayerId;
  const blank = state.board.indexOf(0);
  const canMove = (i: number) => {
    const ar = Math.floor(i / NP_N), ac = i % NP_N, br = Math.floor(blank / NP_N), bc = blank % NP_N;
    return Math.abs(ar - br) + Math.abs(ac - bc) === 1;
  };

  return (
    <div className="mx-auto w-fit">
      <div className="mb-3 text-center text-sm text-muted-foreground">Moves: <b className="text-foreground tabular-nums">{state.moves}</b></div>
      <div className="relative rounded-xl bg-amber-900/30 p-2" style={{ width: NP_N * 64 + GAP, height: NP_N * 64 + GAP }}>
        {state.board.map((v, i) => {
          if (v === 0) return null;
          const r = Math.floor(i / NP_N), c = i % NP_N;
          const solvedTile = v === i + 1;
          return (
            <motion.button
              key={v}
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 34 }}
              disabled={!active || !canMove(i)}
              onClick={() => active && canMove(i) && !pending && onMove({ index: i })}
              className={cn(
                'absolute grid place-items-center rounded-lg text-2xl font-extrabold shadow-md',
                solvedTile ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white' : 'bg-gradient-to-br from-primary to-accent text-white',
                active && canMove(i) && 'cursor-pointer ring-2 ring-white/0 hover:ring-white/60',
              )}
              style={{ width: 56, height: 56, left: c * 64 + GAP / 2, top: r * 64 + GAP / 2 }}
            >
              {v}
            </motion.button>
          );
        })}
      </div>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        {state.solved ? `🎉 Solved in ${state.moves} moves!` : 'Slide tiles into 1–15 order'}
      </p>
    </div>
  );
}
