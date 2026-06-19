import { useEffect, useRef, useState } from 'react';
import { CS_DURATION_MS, type ClickSpeedState } from '@play-nepal/shared';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

type Phase = 'ready' | 'running' | 'submitted';

export function ClickSpeed({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as ClickSpeedState;
  const submitted = state.submitted.includes(myPlayerId);
  const [phase, setPhase] = useState<Phase>(submitted ? 'submitted' : 'ready');
  const [count, setCount] = useState(0);
  const [remaining, setRemaining] = useState(CS_DURATION_MS / 1000);
  const tick = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => () => clearInterval(tick.current), []);

  const start = () => {
    if (phase !== 'ready' || submitted) return;
    setCount(0);
    setPhase('running');
    const end = Date.now() + CS_DURATION_MS;
    setRemaining(CS_DURATION_MS / 1000);
    tick.current = setInterval(() => {
      const left = Math.max(0, end - Date.now());
      setRemaining(left / 1000);
      if (left <= 0) {
        clearInterval(tick.current);
        setPhase('submitted');
        setCount((c) => { onMove({ clicks: c }); return c; });
      }
    }, 50);
  };

  const myClicks = state.clicks[myPlayerId];
  const cps = state.finished && myClicks !== undefined ? (myClicks / (state.durationMs / 1000)).toFixed(1) : null;

  return (
    <div className="mx-auto w-full max-w-md text-center">
      <button
        onClick={() => phase === 'running' && setCount((c) => c + 1)}
        disabled={phase !== 'running'}
        className={cn('grid h-64 w-full select-none place-items-center rounded-2xl text-white transition-colors',
          phase === 'running' ? 'bg-gradient-to-br from-primary to-accent active:scale-[0.99]' : 'bg-secondary')}
      >
        {phase === 'running' ? (
          <div>
            <div className="text-6xl font-extrabold tabular-nums">{count}</div>
            <div className="mt-2 text-lg">⏱ {remaining.toFixed(1)}s</div>
            <div className="mt-1 text-sm opacity-80">CLICK!</div>
          </div>
        ) : phase === 'submitted' || submitted ? (
          <div className="text-foreground">
            <div className="text-2xl font-bold">{state.finished ? '🏁 Done!' : 'Submitted ✓'}</div>
            {myClicks !== undefined && <div className="mt-2 text-4xl font-extrabold">{myClicks} clicks{cps && ` · ${cps} CPS`}</div>}
            {!state.finished && <div className="mt-2 text-sm text-muted-foreground">Waiting for others…</div>}
          </div>
        ) : (
          <div className="text-foreground">
            <div className="text-2xl font-bold">Ready?</div>
            <div className="mt-1 text-sm text-muted-foreground">Click as fast as you can for 5 seconds</div>
          </div>
        )}
      </button>
      {phase === 'ready' && !submitted && <Button size="lg" className="mt-4" disabled={pending} onClick={start}>Start</Button>}
    </div>
  );
}
