import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { MathState } from '@play-nepal/shared';
import { Badge, Button, Input } from '@/components/ui';
import type { GameBoardProps } from './types';

export function MathChallenge({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as MathState;
  const [value, setValue] = useState('');
  const [answered, setAnswered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset when the round advances.
  useEffect(() => { setValue(''); setAnswered(false); inputRef.current?.focus(); }, [state.round]);

  const p = state.problems[state.round];
  const myScore = state.scores[myPlayerId] ?? 0;

  if (state.finished || !p) {
    return (
      <div className="grid place-items-center py-10 text-center">
        <div className="text-5xl">🔢</div>
        <h3 className="mt-2 text-xl font-bold">Challenge complete!</h3>
        <p className="text-muted-foreground">Your score: {myScore} / {state.problems.length}</p>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answered || value.trim() === '') return;
    setAnswered(true);
    onMove({ answer: Number(value) });
  };

  return (
    <div className="mx-auto w-full max-w-sm space-y-5 text-center">
      <div className="flex items-center justify-between text-sm">
        <Badge variant="muted">Round {state.round + 1} / {state.problems.length}</Badge>
        <span className="text-muted-foreground">Score: <b className="text-foreground">{myScore}</b></span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <motion.div className="h-full bg-gradient-to-r from-primary to-accent" initial={false} animate={{ width: `${(state.round / state.problems.length) * 100}%` }} />
      </div>

      <motion.div key={state.round} initial={{ opacity: 0, scale: 0.85, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="rounded-2xl border border-border bg-gradient-to-br from-secondary/60 to-card py-8 text-5xl font-extrabold tracking-wide shadow-inner">
        {p.a} <span className="text-primary">{p.op}</span> {p.b} <span className="text-muted-foreground">= ?</span>
      </motion.div>

      <form onSubmit={submit} className="flex gap-2">
        <Input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={answered || pending}
          placeholder="Your answer"
          className="text-center text-lg"
          autoFocus
        />
        <Button type="submit" disabled={answered || pending}>Submit</Button>
      </form>

      {answered && <p className="text-sm text-muted-foreground">Submitted — waiting for the next round…</p>}
    </div>
  );
}
