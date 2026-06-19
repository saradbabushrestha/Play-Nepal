import { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Game2048State, Game2048Dir } from '@play-nepal/shared';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

const TILE: Record<number, string> = {
  2: 'from-amber-50 to-amber-200 text-amber-900', 4: 'from-amber-100 to-amber-300 text-amber-900',
  8: 'from-orange-300 to-orange-400 text-white', 16: 'from-orange-400 to-orange-500 text-white',
  32: 'from-orange-500 to-red-500 text-white', 64: 'from-red-500 to-rose-600 text-white',
  128: 'from-yellow-300 to-amber-400 text-white', 256: 'from-yellow-400 to-amber-500 text-white',
  512: 'from-yellow-500 to-amber-600 text-white', 1024: 'from-emerald-400 to-emerald-600 text-white',
  2048: 'from-emerald-500 to-teal-600 text-white',
};
const NUDGE: Record<Game2048Dir, { x: number; y: number }> = {
  left: { x: -6, y: 0 }, right: { x: 6, y: 0 }, up: { x: 0, y: -6 }, down: { x: 0, y: 6 },
};

export function Game2048({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as Game2048State;
  const myTurn = snapshot.turn === myPlayerId && !snapshot.result;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Game2048Dir> = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', s: 'down', a: 'left', d: 'right',
      };
      const dir = map[e.key];
      if (dir && myTurn && !pending) { e.preventDefault(); onMove({ dir }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [myTurn, pending, onMove]);

  const nudge = state.lastMove ? NUDGE[state.lastMove] : { x: 0, y: 0 };

  return (
    <div className="mx-auto w-full max-w-xs">
      <div className="mb-3 flex justify-between text-sm">
        <Stat label="Score" value={state.score} />
        <Stat label="Best tile" value={state.best} />
      </div>
      <motion.div
        key={state.score}
        initial={{ x: nudge.x, y: nudge.y }}
        animate={{ x: 0, y: 0 }}
        transition={{ type: 'spring', stiffness: 700, damping: 18 }}
        className="grid grid-cols-4 gap-2.5 rounded-2xl bg-gradient-to-br from-amber-950/40 to-amber-900/20 p-2.5 inset-deep"
      >
        {state.board.map((v, i) => (
          <div key={i} className="relative flex aspect-square items-center justify-center rounded-xl bg-black/25">
            {v > 0 && (
              <motion.div
                key={`${i}-${v}`}
                initial={{ scale: 0.3 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 520, damping: 18 }}
                className={cn('flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br font-extrabold shadow-md', TILE[v] ?? 'from-emerald-600 to-teal-700 text-white', v >= 1000 ? 'text-lg' : 'text-2xl')}
              >
                {v}
              </motion.div>
            )}
          </div>
        ))}
      </motion.div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <div />
        <Button variant="outline" size="sm" disabled={!myTurn || pending} onClick={() => onMove({ dir: 'up' })}>↑</Button>
        <div />
        <Button variant="outline" size="sm" disabled={!myTurn || pending} onClick={() => onMove({ dir: 'left' })}>←</Button>
        <Button variant="outline" size="sm" disabled={!myTurn || pending} onClick={() => onMove({ dir: 'down' })}>↓</Button>
        <Button variant="outline" size="sm" disabled={!myTurn || pending} onClick={() => onMove({ dir: 'right' })}>→</Button>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">Arrow keys / WASD or the buttons</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-secondary px-4 py-1.5 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-bold tabular-nums">{value}</div>
    </div>
  );
}
