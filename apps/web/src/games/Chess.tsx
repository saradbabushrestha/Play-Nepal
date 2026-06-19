import { useState } from 'react';
import { motion } from 'framer-motion';
import { getEngine, type ChessState, type ChessMove, type PieceType } from '@play-nepal/shared';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

const eng = getEngine('chess')!;
const GLYPH: Record<PieceType, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };

export function Chess({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as ChessState;
  const [sel, setSel] = useState<number | null>(null);
  const [promo, setPromo] = useState<{ from: number; to: number } | null>(null);

  const mySide = state.players.w === myPlayerId ? 'w' : state.players.b === myPlayerId ? 'b' : null;
  const myTurn = snapshot.turn === myPlayerId && !snapshot.result;
  const flip = mySide === 'b';

  const legal = (myTurn ? eng.legalMoves(state, myPlayerId) : []) as ChessMove[];
  const fromSel = legal.filter((m) => m.from === sel);
  const destSet = new Set(fromSel.map((m) => m.to));

  const click = (idx: number) => {
    if (!myTurn || pending || promo) return;
    if (sel !== null && destSet.has(idx)) {
      if (fromSel.some((m) => m.to === idx && m.promotion)) setPromo({ from: sel, to: idx });
      else { onMove({ from: sel, to: idx }); setSel(null); }
      return;
    }
    const p = state.board[idx];
    if (p && p.c === mySide && legal.some((m) => m.from === idx)) setSel(idx);
    else setSel(null);
  };

  const checkSq = state.check ? state.board.findIndex((p) => p?.t === 'k' && p.c === state.turn) : -1;

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="surface-wood-dark rounded-2xl p-2.5 shadow-2xl">
        <div className="grid grid-cols-8 overflow-hidden rounded-lg">
          {Array.from({ length: 64 }).map((_, d) => {
            const idx = flip ? 63 - d : d;
            const row = Math.floor(d / 8), col = d % 8;
            const light = (row + col) % 2 === 0;
            const piece = state.board[idx];
            const isDest = destSet.has(idx);
            const isSel = sel === idx;
            const isLast = state.lastMove && (state.lastMove.from === idx || state.lastMove.to === idx);
            const moved = state.lastMove?.to === idx;
            const fromD = moved ? (flip ? 63 - state.lastMove!.from : state.lastMove!.from) : 0;
            const dx = moved ? ((fromD % 8) - col) * 100 : 0;
            const dy = moved ? (Math.floor(fromD / 8) - row) * 100 : 0;
            return (
              <button key={d} disabled={!myTurn || pending} onClick={() => click(idx)}
                className={cn('relative flex aspect-square items-center justify-center', light ? 'bg-[#e9d2a8]' : 'bg-[#9a6b3f]')}>
                {isLast && <span className="absolute inset-0 bg-amber-300/35" />}
                {idx === checkSq && <span className="absolute inset-0 bg-red-500/45" />}
                {isSel && <span className="absolute inset-0 ring-[3px] ring-inset ring-emerald-400" />}
                {isDest && !piece && <span className="absolute h-1/3 w-1/3 rounded-full bg-emerald-500/55" />}
                {isDest && piece && <span className="absolute inset-1 rounded-full ring-[3px] ring-emerald-500/70" />}
                {piece && (
                  <motion.span
                    initial={moved ? { x: `${dx}%`, y: `${dy}%` } : false}
                    animate={{ x: 0, y: 0 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="relative z-10 select-none leading-none"
                    style={{
                      fontSize: '2rem',
                      color: piece.c === 'w' ? '#fafafa' : '#1c1917',
                      textShadow: piece.c === 'w'
                        ? '0 1px 1px rgba(0,0,0,0.6), 0 0 2px rgba(0,0,0,0.7)'
                        : '0 1px 1px rgba(255,255,255,0.35), 0 0 1px rgba(255,255,255,0.5)',
                    }}
                  >
                    {GLYPH[piece.t]}
                  </motion.span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">You play <b className={mySide === 'w' ? 'text-zinc-100' : 'text-zinc-400'}>{mySide === 'w' ? '♔ White' : '♚ Black'}</b></span>
        {state.check && !snapshot.result && <span className="font-semibold text-red-400">Check!</span>}
      </div>

      {promo && (
        <div className="absolute inset-0 z-20 grid place-items-center rounded-2xl bg-black/60">
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="mb-2 text-sm font-semibold">Promote to</p>
            <div className="flex gap-2">
              {(['q', 'r', 'b', 'n'] as const).map((t) => (
                <button key={t} onClick={() => { onMove({ from: promo.from, to: promo.to, promotion: t }); setPromo(null); setSel(null); }}
                  className="grid h-12 w-12 place-items-center rounded-lg border border-border text-3xl hover:bg-secondary"
                  style={{ color: mySide === 'w' ? '#fafafa' : '#1c1917', textShadow: '0 0 2px rgba(0,0,0,0.6)' }}>
                  {GLYPH[t]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
