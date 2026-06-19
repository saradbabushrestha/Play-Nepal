import { motion } from 'framer-motion';
import type { TruthOrDareState } from '@play-nepal/shared';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

export function TruthOrDare({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as TruthOrDareState;
  const myTurn = snapshot.turn === myPlayerId && !snapshot.result;
  const activeName = state.names[state.turn] ?? 'Someone';

  return (
    <div className="mx-auto w-full max-w-md space-y-5 text-center">
      <div className="text-sm text-muted-foreground">
        Round {Math.min(state.round + 1, state.maxRounds)} / {state.maxRounds} ·{' '}
        <b className="text-foreground">{myTurn ? 'Your turn' : `${activeName}’s turn`}</b>
      </div>

      {state.current ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className={cn('rounded-2xl border-2 p-6', state.current.kind === 'truth' ? 'border-accent bg-accent/10' : 'border-primary bg-primary/10')}>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{state.current.kind}</div>
          <p className="mt-3 text-xl font-semibold">{state.current.text}</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button disabled={!myTurn || pending} onClick={() => onMove({ type: 'pick', kind: 'truth' })}
            className="rounded-2xl border-2 border-accent bg-accent/10 p-8 text-xl font-extrabold text-accent transition-transform enabled:hover:scale-[1.03] disabled:opacity-50">
            🤔 Truth
          </button>
          <button disabled={!myTurn || pending} onClick={() => onMove({ type: 'pick', kind: 'dare' })}
            className="rounded-2xl border-2 border-primary bg-primary/10 p-8 text-xl font-extrabold text-primary transition-transform enabled:hover:scale-[1.03] disabled:opacity-50">
            🔥 Dare
          </button>
        </div>
      )}

      {state.current && myTurn && <Button size="lg" disabled={pending} onClick={() => onMove({ type: 'done' })}>Done → Next player</Button>}
      {!myTurn && <p className="text-sm text-muted-foreground">Waiting for {activeName}…</p>}
    </div>
  );
}
