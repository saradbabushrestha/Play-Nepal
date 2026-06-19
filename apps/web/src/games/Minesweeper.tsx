import { useState } from 'react';
import { motion } from 'framer-motion';
import { MS_W, MS_H, type MinesweeperState } from '@play-nepal/shared';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

const NUM_COLORS = ['', '#3b82f6', '#16a34a', '#ef4444', '#1e40af', '#9a3412', '#0e7490', '#1f2937', '#6b7280'];

export function Minesweeper({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as MinesweeperState;
  const [flagMode, setFlagMode] = useState(false);
  const mineSet = new Set(state.mines);
  const flagsUsed = state.flagged.filter(Boolean).length;
  const playing = state.status === 'playing' && snapshot.turn === myPlayerId;

  const handle = (i: number, forceFlag: boolean) => {
    if (!playing || pending) return;
    onMove({ type: forceFlag || flagMode ? 'flag' : 'reveal', index: i });
  };

  return (
    <div className="mx-auto w-fit">
      <div className="mb-3 flex items-center justify-between gap-4">
        <span className="rounded-lg bg-black/40 px-3 py-1 font-mono text-lg font-bold text-red-500">💣 {String(state.mineCount - flagsUsed).padStart(2, '0')}</span>
        <span className="text-2xl">{state.status === 'won' ? '😎' : state.status === 'lost' ? '😵' : '🙂'}</span>
        <Button size="sm" variant={flagMode ? 'default' : 'outline'} onClick={() => setFlagMode((f) => !f)}>🚩 {flagMode ? 'On' : 'Off'}</Button>
      </div>
      <div className="grid gap-[3px] rounded-lg bg-slate-700 p-1.5" style={{ gridTemplateColumns: `repeat(${MS_W}, minmax(0, 1fr))` }}>
        {Array.from({ length: MS_W * MS_H }).map((_, i) => {
          const revealed = state.revealed[i];
          const isMine = mineSet.has(i);
          const count = state.counts[i];
          return (
            <motion.button
              key={i}
              whileTap={!revealed && playing ? { scale: 0.9 } : undefined}
              disabled={!playing}
              onClick={() => handle(i, false)}
              onContextMenu={(e) => { e.preventDefault(); handle(i, true); }}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded text-sm font-extrabold transition-colors',
                revealed
                  ? state.exploded === i ? 'bg-red-500' : 'bg-slate-300'
                  : 'bg-gradient-to-br from-slate-400 to-slate-500 shadow-[inset_0_2px_2px_rgba(255,255,255,0.4)] hover:from-slate-300',
              )}
            >
              {revealed
                ? isMine ? '💣' : count && count > 0 ? <span style={{ color: NUM_COLORS[count] }}>{count}</span> : ''
                : state.flagged[i] ? '🚩' : ''}
            </motion.button>
          );
        })}
      </div>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        {flagMode ? 'Tap to flag' : 'Tap to reveal'} · right-click flags · {state.status === 'won' ? '🎉 Cleared!' : state.status === 'lost' ? '💥 Boom!' : 'good luck'}
      </p>
    </div>
  );
}
