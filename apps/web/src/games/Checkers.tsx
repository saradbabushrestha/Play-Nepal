import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getEngine, type CheckersState, type CheckersMove } from '@play-nepal/shared';
import { discBackground } from '@/components/game/Piece';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

const eng = getEngine('checkers')!;

export function Checkers({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as CheckersState;
  const [sel, setSel] = useState<number | null>(null);
  const mySide = state.players.RED === myPlayerId ? 'RED' : state.players.BLACK === myPlayerId ? 'BLACK' : null;
  const myTurn = snapshot.turn === myPlayerId && !snapshot.result;

  const legal = (myTurn ? eng.legalMoves(state, myPlayerId) : []) as CheckersMove[];
  const active = state.mustJumpFrom ?? sel;
  const dests = legal.filter((m) => m.from === active).map((m) => m.to);
  const mineAt = (i: number) => {
    const p = state.board[i];
    return mySide === 'RED' ? p === 'r' || p === 'R' : p === 'b' || p === 'B';
  };

  function click(i: number) {
    if (!myTurn || pending) return;
    if (active !== null && dests.includes(i)) { onMove({ from: active, to: i }); setSel(null); return; }
    if (mineAt(i) && legal.some((m) => m.from === i)) { setSel(i); return; }
    setSel(null);
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="surface-wood-dark rounded-2xl p-2.5 shadow-2xl">
        <div className="grid grid-cols-8 overflow-hidden rounded-lg">
          {state.board.map((cell, i) => {
            const r = Math.floor(i / 8), c = i % 8;
            const dark = (r + c) % 2 === 1;
            const isDest = dests.includes(i);
            const isSel = active === i;
            const moved = state.lastMove?.to === i;
            const dx = moved ? (((state.lastMove!.from % 8) - c) * 100) : 0;
            const dy = moved ? ((Math.floor(state.lastMove!.from / 8) - r) * 100) : 0;
            const red = cell === 'r' || cell === 'R';
            const king = cell === 'R' || cell === 'B';
            return (
              <button key={i} disabled={!dark || !myTurn || pending} onClick={() => click(i)}
                className={cn('relative flex aspect-square items-center justify-center', dark ? 'surface-wood' : 'bg-amber-950/70')}>
                {dark && <span className="pointer-events-none absolute inset-0 bg-black/25" />}
                {isDest && <span className="absolute z-10 h-3.5 w-3.5 rounded-full bg-emerald-400 shadow hint-pulse" />}
                <AnimatePresence>
                  {cell !== 'EMPTY' && (
                    <motion.div
                      key={i}
                      initial={moved ? { x: `${dx}%`, y: `${dy}%` } : { scale: 1 }}
                      animate={{ x: 0, y: 0, scale: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      className={cn('relative z-[5] flex h-[76%] w-[76%] items-center justify-center rounded-full', isSel && 'ring-[3px] ring-emerald-300')}
                      style={{ background: discBackground(red ? '#dc2626' : '#27272a') }}
                    >
                      <span className="h-[58%] w-[58%] rounded-full" style={{ boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.18)' }} />
                      {king && <span className="absolute text-amber-300 text-sm">♔</span>}
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        You are <b className={mySide === 'RED' ? 'text-red-500' : 'text-zinc-300'}>{mySide === 'RED' ? 'Red' : 'Black'}</b>
        {state.mustJumpFrom !== null && myTurn && ' · keep jumping!'}
      </p>
    </div>
  );
}
