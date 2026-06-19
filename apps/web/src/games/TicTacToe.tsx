import { motion } from 'framer-motion';
import type { TicTacToeState } from '@play-nepal/shared';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

export function TicTacToe({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as TicTacToeState;
  const myMark = state.players.X === myPlayerId ? 'X' : state.players.O === myPlayerId ? 'O' : null;
  const myTurn = snapshot.turn === myPlayerId && !snapshot.result;
  const win = new Set(state.winningLine ?? []);

  return (
    <div className="mx-auto w-full max-w-xs">
      <div className="grid grid-cols-3 gap-2.5">
        {state.board.map((cell, i) => (
          <motion.button
            key={i}
            whileHover={myTurn && !cell ? { scale: 1.04 } : undefined}
            whileTap={myTurn && !cell ? { scale: 0.95 } : undefined}
            disabled={!myTurn || cell !== null || pending}
            onClick={() => onMove({ index: i })}
            className={cn(
              'relative flex aspect-square items-center justify-center rounded-2xl border bg-gradient-to-br from-secondary/60 to-secondary/20 shadow-inner transition-colors',
              win.has(i) ? 'border-primary bg-primary/10 animate-win-glow' : 'border-border',
            )}
          >
            {cell === 'X' && <XMark />}
            {cell === 'O' && <OMark />}
          </motion.button>
        ))}
      </div>
      {myMark && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          You are <b className={myMark === 'X' ? 'text-primary' : 'text-accent'}>{myMark}</b>
        </p>
      )}
    </div>
  );
}

function XMark() {
  return (
    <svg viewBox="0 0 100 100" className="h-3/5 w-3/5">
      {[['M22 22 L78 78'], ['M78 22 L22 78']].map((d, i) => (
        <motion.path key={i} d={d[0]} stroke="hsl(var(--primary))" strokeWidth={12} strokeLinecap="round" fill="none"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.25, delay: i * 0.12 }} />
      ))}
    </svg>
  );
}

function OMark() {
  return (
    <svg viewBox="0 0 100 100" className="h-3/5 w-3/5">
      <motion.circle cx={50} cy={50} r={28} stroke="hsl(var(--accent))" strokeWidth={12} fill="none" strokeLinecap="round"
        initial={{ pathLength: 0, rotate: -90 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35 }} style={{ transformOrigin: 'center' }} />
    </svg>
  );
}
