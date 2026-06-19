import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { MostLikelyState } from '@play-nepal/shared';
import { Avatar } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

export function MostLikelyTo({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as MostLikelyState;
  const [voted, setVoted] = useState<string | null>(null);
  useEffect(() => setVoted(null), [state.round]);

  const prompt = state.bank[state.round];
  if (state.finished || !prompt) {
    return (
      <div className="grid place-items-center py-12 text-center">
        <div className="text-5xl">🏆</div>
        <h3 className="mt-2 text-xl font-bold">All votes are in!</h3>
        <p className="text-muted-foreground">Check the results screen for the verdict.</p>
      </div>
    );
  }

  const roundVotes = state.votes[state.round] ?? {};
  const counts: Record<string, number> = {};
  for (const t of Object.values(roundVotes)) counts[t] = (counts[t] ?? 0) + 1;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const showTally = voted !== null;

  const vote = (target: string) => { if (!voted && !pending) { setVoted(target); onMove({ target }); } };

  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      <div className="text-center text-sm text-muted-foreground">Question {state.round + 1} / {state.bank.length}</div>
      <h3 className="text-center text-2xl font-extrabold">Who is most likely to<br />{prompt}?</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {state.players.map((p, i) => {
          const c = counts[p] ?? 0;
          const pct = total ? Math.round((c / total) * 100) : 0;
          const mine = voted === p;
          return (
            <button key={p} onClick={() => vote(p)} disabled={!!voted || pending}
              className={cn('relative flex items-center gap-3 overflow-hidden rounded-xl border-2 p-3 text-left transition-all',
                mine ? 'border-primary' : 'border-border', !voted && 'hover:border-primary/60')}>
              {showTally && <motion.div className="absolute inset-0 bg-primary/15" initial={{ width: 0 }} animate={{ width: `${pct}%` }} />}
              <Avatar name={state.names[i]!} className="relative h-9 w-9" />
              <span className="relative flex-1 font-semibold">{state.names[i]}{p === myPlayerId ? ' (you)' : ''}</span>
              {showTally && <span className="relative font-bold">{pct}%</span>}
            </button>
          );
        })}
      </div>
      {voted && <p className="text-center text-sm text-muted-foreground">Voted! {total} {total === 1 ? 'vote' : 'votes'} so far…</p>}
    </div>
  );
}
