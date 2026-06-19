import { useMemo, useState } from 'react';
import { WS_SIZE as N, type WordSearchState } from '@play-nepal/shared';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

function lineBetween(a: number, b: number): number[] | null {
  const ar = Math.floor(a / N), ac = a % N, br = Math.floor(b / N), bc = b % N;
  const dr = Math.sign(br - ar), dc = Math.sign(bc - ac);
  const straight = ar === br || ac === bc || Math.abs(br - ar) === Math.abs(bc - ac);
  if (!straight) return null;
  const steps = Math.max(Math.abs(br - ar), Math.abs(bc - ac));
  const cells: number[] = [];
  for (let k = 0; k <= steps; k++) cells.push((ar + dr * k) * N + (ac + dc * k));
  return cells;
}

export function WordSearch({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as WordSearchState;
  const [start, setStart] = useState<number | null>(null);
  const active = state.found.length < state.words.length && snapshot.turn === myPlayerId;

  const foundCells = useMemo(() => {
    const set = new Set<number>();
    state.found.forEach((i) => state.words[i]!.cells.forEach((c) => set.add(c)));
    return set;
  }, [state.found, state.words]);

  const preview = start !== null ? new Set([start]) : new Set<number>();

  const click = (i: number) => {
    if (!active || pending) return;
    if (start === null) { setStart(i); return; }
    if (i === start) { setStart(null); return; }
    const cells = lineBetween(start, i);
    if (cells) onMove({ cells });
    setStart(null);
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mx-auto w-fit rounded-xl bg-amber-900/20 p-2">
        <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))` }}>
          {state.grid.map((ch, i) => (
            <button
              key={i}
              disabled={!active}
              onClick={() => click(i)}
              className={cn('flex h-8 w-8 items-center justify-center rounded text-sm font-bold transition-colors',
                foundCells.has(i) ? 'bg-emerald-500/70 text-white'
                  : preview.has(i) ? 'bg-primary text-primary-foreground'
                  : 'bg-card hover:bg-secondary')}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {state.words.map((w, i) => (
          <span key={i} className={cn('rounded-full px-3 py-1 text-sm font-semibold', state.found.includes(i) ? 'bg-emerald-500/20 text-emerald-400 line-through' : 'bg-secondary')}>
            {w.word}
          </span>
        ))}
      </div>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        {state.found.length >= state.words.length ? '🎉 All words found!' : 'Tap the first and last letter of a word'}
      </p>
    </div>
  );
}
