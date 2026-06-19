import { useEffect, useState } from 'react';
import type { SudokuState } from '@play-nepal/shared';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

export function Sudoku({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as SudokuState;
  const [sel, setSel] = useState<number | null>(null);
  const active = state.status === 'playing' && snapshot.turn === myPlayerId;

  const set = (v: number) => { if (sel !== null && active && !state.fixed[sel] && !pending) onMove({ index: sel, value: v }); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sel === null) return;
      if (e.key >= '1' && e.key <= '9') set(Number(e.key));
      else if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') set(0);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, active, pending]);

  const selVal = sel !== null ? state.current[sel] : 0;
  const conflict = (i: number) => {
    const v = state.current[i];
    if (!v) return false;
    const r = Math.floor(i / 9), c = i % 9, br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let k = 0; k < 9; k++) {
      if (k !== c && state.current[r * 9 + k] === v) return true;
      if (k !== r && state.current[k * 9 + c] === v) return true;
    }
    for (let rr = br; rr < br + 3; rr++) for (let cc = bc; cc < bc + 3; cc++) {
      const j = rr * 9 + cc;
      if (j !== i && state.current[j] === v) return true;
    }
    return false;
  };

  return (
    <div className="mx-auto w-fit">
      <div className="grid grid-cols-9 gap-0 overflow-hidden rounded-lg border-2 border-foreground/70 bg-foreground/70" style={{ gap: 1 }}>
        {state.current.map((v, i) => {
          const r = Math.floor(i / 9), c = i % 9;
          const fixed = state.fixed[i];
          const isSel = sel === i;
          const peer = sel !== null && (Math.floor(sel / 9) === r || sel % 9 === c || (Math.floor(Math.floor(sel / 9) / 3) === Math.floor(r / 3) && Math.floor((sel % 9) / 3) === Math.floor(c / 3)));
          const sameVal = v !== 0 && v === selVal;
          return (
            <button
              key={i}
              onClick={() => setSel(i)}
              disabled={!active}
              className={cn(
                'flex h-9 w-9 items-center justify-center text-lg font-semibold transition-colors',
                c % 3 === 2 && c !== 8 && 'mr-[2px]', r % 3 === 2 && r !== 8 && 'mb-[2px]',
                isSel ? 'bg-primary/30' : peer ? 'bg-secondary' : 'bg-card',
                sameVal && !isSel && 'bg-accent/20',
                fixed ? 'text-foreground' : conflict(i) ? 'text-red-500' : 'text-primary',
              )}
            >
              {v || ''}
            </button>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-9 gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button key={n} onClick={() => set(n)} disabled={!active || sel === null} className="rounded-lg border border-border py-2 text-lg font-bold hover:bg-secondary disabled:opacity-40">{n}</button>
        ))}
      </div>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        {state.status === 'won' ? '🎉 Solved!' : 'Pick a cell, then a number (or type 1–9, Del to clear)'}
      </p>
    </div>
  );
}
