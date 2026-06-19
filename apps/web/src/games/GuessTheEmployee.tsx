import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getEngine, type GuessEmployeeState } from '@play-nepal/shared';
import { Avatar, Button, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

const eng = getEngine('guess-the-employee')!;

export function GuessTheEmployee({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as GuessEmployeeState;
  const [text, setText] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => { setDone(false); }, [state.round, state.phase]);

  const myScore = state.scores[myPlayerId] ?? 0;
  if (state.finished) {
    return (
      <div className="grid place-items-center py-12 text-center">
        <div className="text-5xl">🕵️</div>
        <h3 className="mt-2 text-xl font-bold">All facts revealed!</h3>
        <p className="text-muted-foreground">You guessed {myScore} correctly.</p>
      </div>
    );
  }

  if (state.phase === 'collect') {
    const submitted = state.facts[myPlayerId] !== undefined;
    return (
      <div className="mx-auto w-full max-w-md space-y-4 text-center">
        <h3 className="text-xl font-bold">Submit a fun fact about yourself 🤫</h3>
        <p className="text-sm text-muted-foreground">Make it surprising — others will try to guess it’s you.</p>
        {submitted ? (
          <p className="text-sm text-muted-foreground">Fact submitted — waiting for everyone…</p>
        ) : (
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) onMove({ type: 'fact', text }); }}>
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. I once met a celebrity…" maxLength={140} autoFocus />
            <Button type="submit" disabled={pending || !text.trim()}>Submit</Button>
          </form>
        )}
      </div>
    );
  }

  // guess phase
  const legal = eng.legalMoves(state, myPlayerId) as { type: string; target: string }[];
  const amAuthor = legal.length === 0 && !done && state.guesses[myPlayerId] === undefined;

  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Fact {state.round + 1} / {state.players.length}</span>
        <span>Correct: <b className="text-primary">{myScore}</b></span>
      </div>
      {state.lastReveal && (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-center text-sm text-emerald-300">
          Last fact was <b>{state.lastReveal.authorName}</b> — {state.lastReveal.correct} guessed right!
        </p>
      )}
      <motion.div key={state.round} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-gradient-to-br from-secondary/60 to-card p-5 text-center text-lg font-semibold">
        “{state.currentFactText}”
      </motion.div>

      {amAuthor ? (
        <p className="text-center text-sm font-semibold text-accent">🤫 This one’s yours — stay quiet!</p>
      ) : done || state.guesses[myPlayerId] ? (
        <p className="text-center text-sm text-muted-foreground">Guess locked in…</p>
      ) : (
        <>
          <p className="text-center text-sm font-semibold">Whose fact is this?</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {state.players.map((p, i) => (
              <button key={p} disabled={pending} onClick={() => { setDone(true); onMove({ type: 'guess', target: p }); }}
                className={cn('flex items-center gap-2 rounded-xl border border-border p-2.5 transition-colors hover:border-primary hover:bg-secondary', p === myPlayerId && 'opacity-60')}>
                <Avatar name={state.names[i]!} className="h-8 w-8" /> {state.names[i]}{p === myPlayerId ? ' (you)' : ''}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
