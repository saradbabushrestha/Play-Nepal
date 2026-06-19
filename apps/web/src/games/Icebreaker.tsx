import { motion } from 'framer-motion';
import type { IcebreakerState } from '@play-nepal/shared';
import { Button } from '@/components/ui';
import type { GameBoardProps } from './types';

export function Icebreaker({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as IcebreakerState;
  const isHost = state.players[0] === myPlayerId;
  const prompt = state.prompts[Math.min(state.index, state.prompts.length - 1)];

  return (
    <div className="mx-auto w-full max-w-lg space-y-5 text-center">
      <div className="text-sm text-muted-foreground">Prompt {Math.min(state.index + 1, state.prompts.length)} / {state.prompts.length}</div>
      <motion.div key={state.index} initial={{ opacity: 0, scale: 0.92, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 20 }}
        className="grid min-h-[160px] place-items-center rounded-2xl border border-border bg-gradient-to-br from-secondary/60 to-card p-8">
        <p className="text-2xl font-bold">❄️ {state.finished ? 'All prompts done — ice broken!' : prompt}</p>
      </motion.div>
      {isHost && !state.finished ? (
        <Button size="lg" disabled={pending} onClick={() => onMove({ type: 'next' })}>Next prompt →</Button>
      ) : !state.finished ? (
        <p className="text-sm text-muted-foreground">Discuss as a group — the host advances</p>
      ) : null}
    </div>
  );
}
