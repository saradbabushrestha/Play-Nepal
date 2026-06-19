import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { MemeBattleState } from '@play-nepal/shared';
import { Button, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

export function MemeBattle({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as MemeBattleState;
  const [text, setText] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => { setText(''); setDone(false); }, [state.round, state.phase]);

  const prompt = state.prompts[state.round];
  if (state.finished || !prompt) {
    return (
      <div className="grid place-items-center py-12 text-center">
        <div className="text-5xl">😂</div>
        <h3 className="mt-2 text-xl font-bold">Battle over!</h3>
        <p className="text-muted-foreground">Your score: {state.scores[myPlayerId] ?? 0}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Round {state.round + 1} / {state.totalRounds}</span>
        <span>Score: <b className="text-primary">{state.scores[myPlayerId] ?? 0}</b></span>
      </div>
      <div className="rounded-2xl border border-border bg-gradient-to-br from-secondary/60 to-card p-5 text-center text-lg font-bold">
        “{prompt}”
      </div>

      {state.phase === 'caption' ? (
        done ? (
          <p className="text-center text-sm text-muted-foreground">Caption submitted — waiting for the others…</p>
        ) : (
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { setDone(true); onMove({ type: 'caption', text }); } }}>
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write your funniest caption…" maxLength={140} autoFocus />
            <Button type="submit" disabled={pending || !text.trim()}>Submit</Button>
          </form>
        )
      ) : (
        <div className="space-y-2">
          <p className="text-center text-sm font-semibold">🗳️ Vote for the funniest (not your own!)</p>
          {state.roundCaptions.map((c, i) => {
            const mine = c.author === myPlayerId;
            return (
              <motion.button key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                disabled={mine || done || pending}
                onClick={() => { setDone(true); onMove({ type: 'vote', captionIndex: i }); }}
                className={cn('w-full rounded-xl border p-3 text-left transition-colors', mine ? 'border-accent bg-accent/10' : 'border-border hover:border-primary hover:bg-secondary')}>
                {c.text} {mine && <span className="text-xs text-accent">(yours)</span>}
              </motion.button>
            );
          })}
          {done && <p className="text-center text-sm text-muted-foreground">Vote locked in…</p>}
        </div>
      )}
    </div>
  );
}
