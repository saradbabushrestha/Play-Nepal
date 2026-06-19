import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { WouldYouRatherState } from '@play-nepal/shared';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

export function WouldYouRather({ snapshot, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as WouldYouRatherState;
  const [voted, setVoted] = useState<'a' | 'b' | null>(null);
  useEffect(() => setVoted(null), [state.round]);

  const prompt = state.bank[state.round];
  if (state.finished || !prompt) {
    return (
      <div className="grid place-items-center py-12 text-center">
        <div className="text-5xl">🤔</div>
        <h3 className="mt-2 text-xl font-bold">That's a wrap!</h3>
        <p className="text-muted-foreground">Great debates — thanks for playing.</p>
      </div>
    );
  }

  const roundVotes = Object.values(state.votes[state.round] ?? {});
  const aVotes = roundVotes.filter((v) => v === 'a').length;
  const bVotes = roundVotes.filter((v) => v === 'b').length;
  const total = aVotes + bVotes;
  const showTally = voted !== null;

  const vote = (choice: 'a' | 'b') => { if (!voted && !pending) { setVoted(choice); onMove({ choice }); } };

  const Card = ({ side, text, votes }: { side: 'a' | 'b'; text: string; votes: number }) => {
    const pct = total ? Math.round((votes / total) * 100) : 0;
    const mine = voted === side;
    return (
      <button
        onClick={() => vote(side)}
        disabled={!!voted || pending}
        className={cn('relative flex-1 overflow-hidden rounded-2xl border-2 p-6 text-left transition-all',
          mine ? 'border-primary' : 'border-border', !voted && 'hover:scale-[1.02] hover:border-primary/60')}
      >
        {showTally && (
          <motion.div className={cn('absolute inset-0', side === 'a' ? 'bg-primary/20' : 'bg-accent/20')}
            initial={{ width: 0 }} animate={{ width: `${pct}%` }} />
        )}
        <div className="relative">
          <div className="mb-2 text-xs font-bold uppercase text-muted-foreground">Option {side.toUpperCase()}</div>
          <div className="text-lg font-semibold">{text}</div>
          {showTally && <div className="mt-3 text-2xl font-extrabold">{pct}%</div>}
        </div>
      </button>
    );
  };

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <div className="text-center text-sm text-muted-foreground">Question {state.round + 1} / {state.bank.length}</div>
      <h3 className="text-center text-2xl font-extrabold">Would you rather…</h3>
      <div className="flex flex-col items-stretch gap-3 sm:flex-row">
        <Card side="a" text={prompt.a} votes={aVotes} />
        <div className="grid place-items-center text-sm font-bold text-muted-foreground">OR</div>
        <Card side="b" text={prompt.b} votes={bVotes} />
      </div>
      {voted && <p className="text-center text-sm text-muted-foreground">Voted! {total} {total === 1 ? 'vote' : 'votes'} so far…</p>}
    </div>
  );
}
