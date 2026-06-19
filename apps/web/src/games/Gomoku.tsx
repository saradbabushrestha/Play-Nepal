import { motion } from 'framer-motion';
import { GOMOKU_SIZE as N, type GomokuState } from '@play-nepal/shared';
import { discBackground } from '@/components/game/Piece';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

const HOSHI = new Set([3 * N + 3, 3 * N + 11, 11 * N + 3, 11 * N + 11, 7 * N + 7]);

export function Gomoku({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as GomokuState;
  const mySide = state.players.B === myPlayerId ? 'B' : state.players.W === myPlayerId ? 'W' : null;
  const myTurn = snapshot.turn === myPlayerId && !snapshot.result;
  const win = new Set(state.winningLine ?? []);

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="surface-wood rounded-xl p-2 shadow-2xl ring-1 ring-amber-950/40">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))` }}>
          {state.board.map((cell, i) => {
            const r = Math.floor(i / N), c = i % N;
            return (
              <button key={i} disabled={cell !== 'EMPTY' || !myTurn || pending} onClick={() => onMove({ index: i })}
                className="relative flex aspect-square items-center justify-center">
                {/* engraved grid lines through the intersection */}
                <span className="absolute bg-amber-950/55" style={{ height: 1.5, left: c === 0 ? '50%' : 0, right: c === N - 1 ? '50%' : 0, top: '50%' }} />
                <span className="absolute bg-amber-950/55" style={{ width: 1.5, top: r === 0 ? '50%' : 0, bottom: r === N - 1 ? '50%' : 0, left: '50%' }} />
                {HOSHI.has(i) && cell === 'EMPTY' && <span className="absolute h-1.5 w-1.5 rounded-full bg-amber-950/70" />}
                {cell !== 'EMPTY' && (
                  <motion.span
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                    className={cn('relative z-10 h-[82%] w-[82%] rounded-full', state.lastMove === i && 'ring-2 ring-primary', win.has(i) && 'ring-2 ring-emerald-400 animate-win-glow')}
                    style={{ background: discBackground(cell === 'B' ? '#18181b' : '#fafafa') }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
      {mySide && (
        <p className="mt-3 text-center text-sm text-muted-foreground">You are <b>{mySide === 'B' ? '⚫ Black' : '⚪ White'}</b> · five in a row wins</p>
      )}
    </div>
  );
}
