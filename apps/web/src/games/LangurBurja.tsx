import { useState } from 'react';
import { motion } from 'framer-motion';
import { LB_SYMBOLS, type LangurBurjaState } from '@play-nepal/shared';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

const CHIPS = [50, 100, 200, 500];

export function LangurBurja({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as LangurBurjaState;
  const [symbol, setSymbol] = useState(0);
  const [stake, setStake] = useState(100);

  const myPoints = state.points[myPlayerId] ?? 0;
  const myBet = state.bets[myPlayerId];
  const myPayout = state.lastPayouts?.[myPlayerId];
  const canBet = !state.finished && !myBet && snapshot.turn === null;

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span>Round <b className="text-foreground">{Math.min(state.round + 1, state.totalRounds)}/{state.totalRounds}</b></span>
        <span>Your points: <b className="text-primary tabular-nums">{myPoints}</b></span>
      </div>

      {/* Dice */}
      <div className="flex justify-center gap-3">
        {(state.lastRoll ?? [0, 1, 2]).map((sym, i) => (
          <motion.div
            key={`${state.round}-${i}`}
            initial={state.lastRoll ? { rotateX: -180, scale: 0.6 } : false}
            animate={{ rotateX: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14, delay: i * 0.1 }}
            className="grid h-16 w-16 place-items-center rounded-xl bg-gradient-to-br from-white to-zinc-200 text-3xl shadow-lg"
          >
            {state.lastRoll ? LB_SYMBOLS[sym] : '🎲'}
          </motion.div>
        ))}
      </div>
      {myPayout !== undefined && myPayout !== null && (
        <p className={cn('text-center font-bold', myPayout > 0 ? 'text-emerald-400' : myPayout < 0 ? 'text-red-400' : 'text-muted-foreground')}>
          {myPayout > 0 ? `+${myPayout} 🎉` : myPayout < 0 ? `${myPayout}` : 'No bet'}
        </p>
      )}

      {/* Symbol picker */}
      <div className="grid grid-cols-6 gap-2">
        {LB_SYMBOLS.map((sym, i) => (
          <button
            key={i}
            disabled={!canBet}
            onClick={() => setSymbol(i)}
            className={cn('grid aspect-square place-items-center rounded-xl border-2 text-2xl transition-colors',
              symbol === i ? 'border-primary bg-primary/15' : 'border-border', myBet?.symbol === i && 'ring-2 ring-accent')}
          >
            {sym}
          </button>
        ))}
      </div>

      {canBet ? (
        <>
          <div className="flex justify-center gap-2">
            {CHIPS.map((c) => (
              <button key={c} disabled={c > myPoints} onClick={() => setStake(c)}
                className={cn('rounded-full px-4 py-1.5 text-sm font-bold transition-colors disabled:opacity-30',
                  stake === c ? 'bg-primary text-primary-foreground' : 'bg-secondary')}>
                {c}
              </button>
            ))}
          </div>
          <Button className="w-full" disabled={pending || stake > myPoints} onClick={() => onMove({ symbol, amount: Math.min(stake, myPoints) })}>
            Stake {Math.min(stake, myPoints)} on {LB_SYMBOLS[symbol]}
          </Button>
        </>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          {state.finished ? '🏁 Game over' : myBet ? `Bet ${myBet.amount} on ${LB_SYMBOLS[myBet.symbol]} — waiting for the roll…` : ''}
        </p>
      )}
    </div>
  );
}
