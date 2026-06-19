import { useEffect, useRef, useState } from 'react';
import type { ReactionState } from '@play-nepal/shared';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

type Phase = 'waiting' | 'go' | 'submitted';

export function ReactionSpeed({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as ReactionState;
  const myTimes = state.results[myPlayerId] ?? [];
  const submittedThisRound = myTimes.length > state.round;

  const [phase, setPhase] = useState<Phase>('waiting');
  const [shownMs, setShownMs] = useState<number | null>(null);
  const goAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Begin a round: red → (random delay) → green.
  useEffect(() => {
    if (state.finished || submittedThisRound) { setPhase('submitted'); return; }
    setPhase('waiting');
    setShownMs(null);
    const delay = 900 + Math.random() * 2200;
    timer.current = setTimeout(() => { goAt.current = Date.now(); setPhase('go'); }, delay);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.round, state.finished, submittedThisRound]);

  const tap = () => {
    if (pending || state.finished || submittedThisRound) return;
    if (phase === 'waiting') { clearTimeout(timer.current); setShownMs(-1); onMove({ ms: 9999 }); setPhase('submitted'); return; }
    if (phase === 'go') {
      const ms = Date.now() - goAt.current;
      setShownMs(ms);
      onMove({ ms });
      setPhase('submitted');
    }
  };

  const best = myTimes.filter((m) => m < 9999);
  const avg = best.length ? Math.round(best.reduce((a, b) => a + b, 0) / best.length) : null;

  const bg = state.finished ? 'bg-slate-700' : phase === 'go' ? 'bg-emerald-500' : phase === 'waiting' ? 'bg-red-600' : 'bg-slate-700';
  const label = state.finished ? 'Done!' : phase === 'go' ? 'TAP!' : phase === 'waiting' ? 'Wait for green…' : submittedThisRound ? 'Waiting for others…' : '';

  return (
    <div className="mx-auto w-full max-w-md text-center">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span>Round <b className="text-foreground">{Math.min(state.round + 1, state.totalRounds)}/{state.totalRounds}</b></span>
        {avg !== null && <span>Avg <b className="text-primary">{avg}ms</b></span>}
      </div>
      <button
        onClick={tap}
        disabled={state.finished}
        className={cn('grid h-56 w-full place-items-center rounded-2xl text-2xl font-extrabold text-white transition-colors', bg)}
      >
        <div>
          <div>{label}</div>
          {shownMs !== null && phase === 'submitted' && (
            <div className="mt-2 text-4xl">{shownMs === -1 ? 'Too soon! 🙈' : `${shownMs}ms`}</div>
          )}
        </div>
      </button>
      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {Array.from({ length: state.totalRounds }).map((_, i) => (
          <span key={i} className={cn('rounded px-2 py-0.5 text-xs font-semibold', myTimes[i] === undefined ? 'bg-secondary text-muted-foreground' : myTimes[i]! >= 9999 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400')}>
            {myTimes[i] === undefined ? '—' : myTimes[i]! >= 9999 ? 'X' : `${myTimes[i]}`}
          </span>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Tap the moment it turns green</p>
    </div>
  );
}
