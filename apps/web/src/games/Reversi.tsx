import { motion } from 'framer-motion';
import { getEngine, type ReversiState, type ReversiMove } from '@play-nepal/shared';
import { discBackground } from '@/components/game/Piece';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

const eng = getEngine('reversi')!;
const hidden = { backfaceVisibility: 'hidden' as const, WebkitBackfaceVisibility: 'hidden' as const };

export function Reversi({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as ReversiState;
  const mySide = state.players.B === myPlayerId ? 'B' : state.players.W === myPlayerId ? 'W' : null;
  const myTurn = snapshot.turn === myPlayerId && !snapshot.result;
  const legal = (myTurn ? eng.legalMoves(state, myPlayerId) : []) as ReversiMove[];
  const hints = new Set(legal.map((m) => m.index));
  const black = state.board.filter((c) => c === 'B').length;
  const white = state.board.filter((c) => c === 'W').length;

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-3 flex items-center justify-center gap-6 text-sm">
        <Score color="#18181b" label="Black" value={black} active={state.turn === 'B' && !snapshot.result} />
        <Score color="#fafafa" label="White" value={white} active={state.turn === 'W' && !snapshot.result} />
      </div>
      <div className="surface-felt rounded-2xl p-2.5 shadow-2xl">
        <div className="grid grid-cols-8 gap-1">
          {state.board.map((cell, i) => (
            <button key={i} disabled={!hints.has(i) || pending} onClick={() => onMove({ index: i })}
              className="group relative flex aspect-square items-center justify-center rounded"
              style={{ background: 'rgba(0,0,0,0.16)', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.2)' }}>
              {cell !== 'EMPTY' ? (
                <div className="h-[84%] w-[84%]" style={{ perspective: 300 }}>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotateY: cell === 'B' ? 0 : 180 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    className={cn('relative h-full w-full rounded-full', state.lastMove === i && 'ring-2 ring-amber-300')}
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <span className="absolute inset-0 rounded-full" style={{ ...hidden, background: discBackground('#18181b') }} />
                    <span className="absolute inset-0 rounded-full" style={{ ...hidden, transform: 'rotateY(180deg)', background: discBackground('#fafafa') }} />
                  </motion.div>
                </div>
              ) : (
                hints.has(i) && <span className="h-3 w-3 rounded-full bg-white/30 transition-all group-hover:scale-125 group-hover:bg-white/60" />
              )}
            </button>
          ))}
        </div>
      </div>
      {mySide && <p className="mt-3 text-center text-sm text-muted-foreground">You are <b>{mySide === 'B' ? 'Black' : 'White'}</b></p>}
    </div>
  );
}

function Score({ color, label, value, active }: { color: string; label: string; value: number; active: boolean }) {
  return (
    <div className={cn('flex items-center gap-2 rounded-full px-3 py-1 transition-colors', active && 'bg-secondary ring-1 ring-primary/40')}>
      <span className="h-5 w-5 rounded-full shadow" style={{ background: discBackground(color) }} />
      <span className="font-semibold">{label}</span>
      <span className="tabular-nums text-muted-foreground">{value}</span>
    </div>
  );
}
