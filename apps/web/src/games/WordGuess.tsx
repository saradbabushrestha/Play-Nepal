import { motion } from 'framer-motion';
import type { WordGuessState } from '@play-nepal/shared';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

export function WordGuess({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as WordGuessState;
  const performerId = state.players[state.performer];
  const amPerformer = performerId === myPlayerId;
  const performerName = state.names[state.performer] ?? 'Someone';
  const word = state.words[state.wordIndex % state.words.length] ?? '';
  const iSeeWord = word !== '';

  const mySeat = state.players.indexOf(myPlayerId);

  const headline = amPerformer
    ? state.performerSeesWord ? '🎭 Act this out — no talking!' : '🙈 Guess your word — listen to the clues!'
    : state.performerSeesWord ? `Guess what ${performerName} is acting!` : `Give ${performerName} clues — don’t say the word!`;

  return (
    <div className="mx-auto w-full max-w-md space-y-5 text-center">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Round {Math.min(state.round + 1, state.totalRounds)} / {state.totalRounds}</span>
        <span>Performer: <b className="text-foreground">{amPerformer ? 'You' : performerName}</b></span>
        <span>Your score: <b className="text-primary">{state.scores[myPlayerId] ?? 0}</b></span>
      </div>

      <motion.div key={state.wordIndex} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className={cn('grid min-h-[140px] place-items-center rounded-2xl border-2 p-6', iSeeWord ? 'border-primary bg-primary/10' : 'border-dashed border-border')}>
        {iSeeWord ? (
          <div className="text-4xl font-extrabold tracking-wide">{word}</div>
        ) : (
          <div className="text-lg font-semibold text-muted-foreground">{amPerformer ? '🤫 You can’t see your word' : '👀 Watch / listen carefully'}</div>
        )}
      </motion.div>

      <p className="font-semibold">{headline}</p>

      {amPerformer && !state.finished && (
        <div className="grid grid-cols-3 gap-2">
          <Button variant="default" disabled={pending} onClick={() => onMove({ type: 'correct' })}>✅ Got it</Button>
          <Button variant="outline" disabled={pending} onClick={() => onMove({ type: 'skip' })}>↦ Skip</Button>
          <Button variant="secondary" disabled={pending} onClick={() => onMove({ type: 'end' })}>⏭ End turn</Button>
        </div>
      )}
      {!amPerformer && mySeat >= 0 && <p className="text-sm text-muted-foreground">{performerName} is performing…</p>}
    </div>
  );
}
