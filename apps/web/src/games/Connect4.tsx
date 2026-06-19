import { AnimatePresence, motion } from 'framer-motion';
import { CONNECT4_COLS, CONNECT4_ROWS, type Connect4State } from '@play-nepal/shared';
import { discBackground } from '@/components/game/Piece';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

export function Connect4({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as Connect4State;
  const myDisc = state.players.R === myPlayerId ? 'R' : state.players.Y === myPlayerId ? 'Y' : null;
  const myTurn = snapshot.turn === myPlayerId && !snapshot.result;
  const columnFull = (col: number) => state.board[col] !== null;
  const win = new Set(state.winningCells ?? []);

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="surface-plastic-blue rounded-2xl p-3">
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: CONNECT4_COLS * CONNECT4_ROWS }).map((_, i) => {
            const cell = state.board[i];
            const col = i % CONNECT4_COLS;
            const row = Math.floor(i / CONNECT4_COLS);
            const disabled = !myTurn || columnFull(col) || pending;
            return (
              <button key={i} disabled={disabled} onClick={() => onMove({ col })}
                className="group relative flex aspect-square items-center justify-center rounded-full"
                style={{ boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.55)', background: 'radial-gradient(circle at 50% 40%, #0b1f52, #0a1838)' }}>
                <AnimatePresence>
                  {cell && (
                    <motion.span
                      key={`${i}-${cell}`}
                      initial={{ y: `-${(row + 1) * 115}%` }}
                      animate={{ y: 0 }}
                      transition={{ type: 'spring', stiffness: 600, damping: 26, mass: 1.1 }}
                      className={cn('block h-[86%] w-[86%] rounded-full', win.has(i) && 'ring-2 ring-white animate-win-glow')}
                      style={{ background: discBackground(cell === 'R' ? '#ef4444' : '#facc15') }}
                    />
                  )}
                </AnimatePresence>
                {!cell && !disabled && (
                  <span className="absolute h-2.5 w-2.5 rounded-full opacity-0 transition-opacity group-hover:opacity-60"
                    style={{ background: myDisc === 'R' ? '#ef4444' : '#facc15' }} />
                )}
              </button>
            );
          })}
        </div>
      </div>
      {myDisc && (
        <p className="mt-3 text-center text-sm text-muted-foreground">
          You are <b className={myDisc === 'R' ? 'text-red-500' : 'text-yellow-400'}>{myDisc === 'R' ? 'Red' : 'Yellow'}</b>
        </p>
      )}
    </div>
  );
}
