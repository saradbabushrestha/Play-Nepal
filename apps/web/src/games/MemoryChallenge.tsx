import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { MemoryChallengeState } from '@play-nepal/shared';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

const PADS = [
  { base: '#15803d', lit: '#4ade80' }, // green
  { base: '#991b1b', lit: '#f87171' }, // red
  { base: '#a16207', lit: '#fde047' }, // yellow
  { base: '#1e40af', lit: '#60a5fa' }, // blue
];

export function MemoryChallenge({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as MemoryChallengeState;
  const [lit, setLit] = useState<number | null>(null);
  const [phase, setPhase] = useState<'watch' | 'input'>('watch');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Replay the sequence whenever a new round begins.
  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (state.status !== 'playing') { setPhase('input'); return; }
    setPhase('watch');
    const seq = state.sequence.slice(0, state.round);
    seq.forEach((color, k) => {
      timers.current.push(setTimeout(() => setLit(color), 200 + k * 650));
      timers.current.push(setTimeout(() => setLit(null), 200 + k * 650 + 400));
    });
    timers.current.push(setTimeout(() => setPhase('input'), 200 + seq.length * 650 + 100));
    return () => timers.current.forEach(clearTimeout);
  }, [state.round, state.status, state.sequence]);

  const tap = (color: number) => {
    if (phase !== 'input' || state.status !== 'playing' || pending || snapshot.turn !== myPlayerId) return;
    setLit(color);
    setTimeout(() => setLit(null), 180);
    onMove({ color });
  };

  return (
    <div className="mx-auto w-fit text-center">
      <div className="mb-3 flex items-center justify-center gap-6 text-sm">
        <span>Round <b className="text-foreground">{Math.min(state.round, 20)}</b></span>
        <span>Score <b className="text-primary">{state.score}</b></span>
        <span className={cn('font-semibold', phase === 'watch' ? 'text-accent' : 'text-emerald-400')}>
          {state.status !== 'playing' ? (state.status === 'won' ? '🏆 Perfect!' : '💀 Game over') : phase === 'watch' ? '👀 Watch…' : '⌨️ Repeat it!'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3" style={{ width: 280 }}>
        {PADS.map((p, i) => (
          <motion.button
            key={i}
            disabled={phase !== 'input' || state.status !== 'playing'}
            onClick={() => tap(i)}
            animate={{ scale: lit === i ? 1.06 : 1, boxShadow: lit === i ? `0 0 28px 4px ${p.lit}` : '0 0 0 0 transparent' }}
            className="aspect-square rounded-2xl"
            style={{ background: lit === i ? p.lit : p.base, transition: 'background 0.1s' }}
          />
        ))}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">Watch the pattern, then tap it back</p>
    </div>
  );
}
