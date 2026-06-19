import { useMemo, useRef, useState } from 'react';
import type { TypingRaceState } from '@play-nepal/shared';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

export function TypingRace({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as TypingRaceState;
  const [typed, setTyped] = useState('');
  const start = useRef(0);
  const submitted = state.results[myPlayerId] !== undefined;

  const correct = useMemo(() => {
    let c = 0;
    for (let i = 0; i < typed.length && i < state.passage.length; i++) if (typed[i] === state.passage[i]) c++;
    return c;
  }, [typed, state.passage]);

  const elapsed = start.current ? (Date.now() - start.current) / 1000 : 0;
  const liveWpm = elapsed > 0 ? Math.round((correct / 5) / (elapsed / 60)) : 0;

  const onChange = (val: string) => {
    if (submitted) return;
    if (!start.current) start.current = Date.now();
    setTyped(val);
    if (val.length >= state.passage.length) {
      const ms = Date.now() - start.current;
      onMove({ ms, correct, total: state.passage.length });
    }
  };

  const myResult = state.results[myPlayerId];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 text-lg leading-relaxed">
        {state.passage.split('').map((ch, i) => (
          <span key={i} className={cn(
            i < typed.length ? (typed[i] === ch ? 'text-emerald-400' : 'bg-red-500/30 text-red-300') : 'text-muted-foreground',
            i === typed.length && 'border-l-2 border-primary')}>
            {ch}
          </span>
        ))}
      </div>

      {submitted || state.finished ? (
        <div className="rounded-xl border border-border bg-secondary/40 p-4 text-center">
          <div className="text-3xl font-extrabold text-primary">{myResult?.wpm ?? 0} WPM</div>
          <div className="text-sm text-muted-foreground">{myResult?.accuracy ?? 0}% accuracy{state.finished ? '' : ' · waiting for others…'}</div>
        </div>
      ) : (
        <>
          <textarea
            autoFocus
            value={typed}
            disabled={pending}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Start typing the passage above…"
            className="h-28 w-full resize-none rounded-xl border border-input bg-background/50 p-3 font-mono text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{typed.length} / {state.passage.length} chars</span>
            <span>~{liveWpm} WPM live</span>
          </div>
        </>
      )}
    </div>
  );
}
