import { motion } from 'framer-motion';
import type { MemoryState } from '@play-nepal/shared';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

const SYMBOLS = ['🐯', '🐘', '🦜', '🌸', '⛰️', '🥁', '🪁', '🛕', '🎋', '🪷', '🦚', '🍵'];
const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308'];
const hidden = { backfaceVisibility: 'hidden' as const, WebkitBackfaceVisibility: 'hidden' as const };

export function MemoryMatch({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as MemoryState;
  const mySeat = state.players.indexOf(myPlayerId);
  const myTurn = snapshot.turn === myPlayerId && !snapshot.result;
  const cols = state.cards.length <= 12 ? 4 : Math.ceil(Math.sqrt(state.cards.length));

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-3 flex justify-center gap-4 text-sm">
        {state.players.map((_, i) => (
          <span key={i} className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors', snapshot.turn === state.players[i] && !snapshot.result && 'bg-secondary ring-1 ring-primary/40')}>
            <span className="h-3 w-3 rounded-full" style={{ background: COLORS[i % 4] }} />
            {i === mySeat ? 'You' : `P${i + 1}`}: <b>{state.scores[i]}</b>
          </span>
        ))}
      </div>
      <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {state.cards.map((value, i) => {
          const faceUp = value !== -1;
          const matched = state.matched[i];
          const disabled = faceUp || matched || !myTurn || pending;
          return (
            <button key={i} disabled={disabled} onClick={() => onMove({ index: i })}
              className="aspect-square" style={{ perspective: 600 }}>
              <motion.div
                className="relative h-full w-full"
                style={{ transformStyle: 'preserve-3d' }}
                animate={{ rotateY: faceUp ? 180 : 0, scale: matched ? 0.9 : 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              >
                {/* back (face-down) */}
                <div className="absolute inset-0 grid place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-xl text-white shadow-md"
                  style={hidden}>
                  <span className="opacity-80">🇳🇵</span>
                </div>
                {/* front (revealed) */}
                <div className={cn('absolute inset-0 grid place-items-center rounded-xl border bg-card text-3xl shadow-md', matched ? 'border-emerald-400 ring-2 ring-emerald-400/60' : 'border-border')}
                  style={{ ...hidden, transform: 'rotateY(180deg)' }}>
                  {SYMBOLS[(value < 0 ? 0 : value) % SYMBOLS.length]}
                </div>
              </motion.div>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-center text-sm text-muted-foreground">{myTurn ? 'Your turn — flip two cards' : 'Waiting for opponent…'}</p>
    </div>
  );
}
