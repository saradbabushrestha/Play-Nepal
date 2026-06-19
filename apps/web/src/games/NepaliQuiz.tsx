import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { QuizState } from '@play-nepal/shared';
import { Badge } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

export function NepaliQuiz({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as QuizState;
  const [picked, setPicked] = useState<number | null>(null);

  // Reset local selection when the round advances.
  useEffect(() => setPicked(null), [state.round]);

  const q = state.bank[state.round];
  const myScore = state.scores[myPlayerId] ?? 0;

  if (state.finished || !q) {
    return (
      <div className="grid place-items-center py-10 text-center">
        <div className="text-5xl">🧠</div>
        <h3 className="mt-2 text-xl font-bold">Quiz complete!</h3>
        <p className="text-muted-foreground">Your score: {myScore} / {state.bank.length}</p>
      </div>
    );
  }

  const answered = picked !== null;

  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      <div className="flex items-center justify-between text-sm">
        <Badge variant="muted">Q{state.round + 1} / {state.bank.length}</Badge>
        <Badge variant="accent">{q.category}</Badge>
        <span className="text-muted-foreground">Score: <b className="text-foreground">{myScore}</b></span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <motion.div className="h-full bg-gradient-to-r from-primary to-accent" initial={false} animate={{ width: `${(state.round / state.bank.length) * 100}%` }} />
      </div>

      <motion.h3 key={state.round} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center text-xl font-bold">
        {q.q}
      </motion.h3>

      <div className="grid gap-2 sm:grid-cols-2">
        {q.options.map((opt, i) => (
          <motion.button
            key={`${state.round}-${i}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            whileHover={!answered ? { scale: 1.02 } : undefined}
            disabled={answered || pending}
            onClick={() => { setPicked(i); onMove({ option: i }); }}
            className={cn(
              'rounded-xl border p-3 text-left font-medium transition-colors',
              picked === i ? 'border-primary bg-primary/15 text-primary' : 'border-border hover:bg-secondary',
              answered && picked !== i && 'opacity-50',
            )}
          >
            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-secondary text-xs font-bold">{String.fromCharCode(65 + i)}</span>
            {opt}
          </motion.button>
        ))}
      </div>

      {answered && <p className="text-center text-sm text-muted-foreground">Answer locked in — waiting for the next round…</p>}
    </div>
  );
}
