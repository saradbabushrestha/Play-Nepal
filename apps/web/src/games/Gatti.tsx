import { useEffect, useRef, useState } from 'react';
import { GATTI_LIVES, type GattiState } from '@play-nepal/shared';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

export function Gatti({ snapshot, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as GattiState;
  const [pos, setPos] = useState(0.5);
  const posRef = useRef(0.05);
  const dirRef = useRef(1);
  const raf = useRef<number>(0);

  const zoneHalf = Math.max(0.06, 0.2 - state.level * 0.028);

  useEffect(() => {
    if (state.status !== 'playing') return;
    const speed = 0.006 + state.level * 0.0035;
    const loop = () => {
      let p = posRef.current + dirRef.current * speed;
      if (p > 0.95) { p = 0.95; dirRef.current = -1; }
      if (p < 0.05) { p = 0.05; dirRef.current = 1; }
      posRef.current = p;
      setPos(p);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [state.level, state.status]);

  const grab = () => {
    if (state.status !== 'playing' || pending) return;
    onMove({ type: 'grab', success: Math.abs(posRef.current - 0.5) < zoneHalf });
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-5 text-center">
      <div className="flex items-center justify-between text-sm">
        <span>Level <b className="text-foreground">{Math.min(state.level, 5)}/5</b></span>
        <span>Stones <b className="text-primary">🪨 {state.stonesGrabbed}</b></span>
        <span>{Array.from({ length: GATTI_LIVES }).map((_, i) => (<span key={i}>{i < state.lives ? '❤️' : '🖤'}</span>))}</span>
      </div>

      {state.status === 'playing' ? (
        <>
          <button onClick={grab} className="relative h-20 w-full overflow-hidden rounded-2xl bg-secondary active:scale-[0.99]">
            <div className="absolute inset-y-0 rounded-lg bg-emerald-500/30 ring-1 ring-emerald-400" style={{ left: `${(0.5 - zoneHalf) * 100}%`, width: `${zoneHalf * 2 * 100}%` }} />
            <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl" style={{ left: `${pos * 100}%` }}>🪨</div>
          </button>
          <p className="text-sm text-muted-foreground">Tap when the stone is in the <b className="text-emerald-400">green zone</b> to grab it · {state.inLevel}/{state.level} this level</p>
          <button onClick={grab} disabled={pending} className="w-full rounded-xl bg-primary py-3 text-lg font-extrabold text-primary-foreground active:scale-[0.98]">GRAB!</button>
        </>
      ) : (
        <div className={cn('rounded-2xl border-2 p-8', state.status === 'won' ? 'border-emerald-400' : 'border-border')}>
          <div className="text-5xl">{state.status === 'won' ? '🏆' : '🪨'}</div>
          <h3 className="mt-2 text-xl font-bold">{state.status === 'won' ? 'All levels cleared!' : 'Out of lives'}</h3>
          <p className="text-muted-foreground">You grabbed {state.stonesGrabbed} stones.</p>
        </div>
      )}
    </div>
  );
}
