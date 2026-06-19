import { motion } from 'framer-motion';
import { DOTS_BOXES as N, type DotsState } from '@play-nepal/shared';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308'];
const CELL = 56;
const PAD = 18;

export function DotsAndBoxes({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as DotsState;
  const mySeat = state.players.indexOf(myPlayerId);
  const myTurn = snapshot.turn === myPlayerId && !snapshot.result;
  const size = N * CELL + PAD * 2;
  const dot = (r: number, c: number) => ({ x: PAD + c * CELL, y: PAD + r * CELL });
  const send = (type: 'H' | 'V', index: number) => myTurn && !pending && onMove({ type, index });
  const last = state.lastMove;

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-3 flex justify-center gap-4 text-sm">
        {state.players.map((_, i) => (
          <span key={i} className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors', snapshot.turn === state.players[i] && !snapshot.result && 'bg-secondary ring-1 ring-primary/40')}>
            <span className="h-3 w-3 rounded-full" style={{ background: COLORS[i] }} />
            {i === mySeat ? 'You' : `P${i + 1}`}: <b>{state.scores[i]}</b>
          </span>
        ))}
      </div>
      <div className="rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 p-3 shadow-xl">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full">
          {state.owner.map((o, i) => {
            if (o < 0) return null;
            const r = Math.floor(i / N), c = i % N;
            return (
              <motion.rect key={`b${i}`} initial={{ scale: 0.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                style={{ transformOrigin: `${PAD + c * CELL + CELL / 2}px ${PAD + r * CELL + CELL / 2}px` }}
                x={PAD + c * CELL + 4} y={PAD + r * CELL + 4} width={CELL - 8} height={CELL - 8} rx={5} fill={COLORS[o]} fillOpacity={0.28} />
            );
          })}

          {Array.from({ length: (N + 1) * N }).map((_, idx) => {
            const r = Math.floor(idx / N), c = idx % N;
            const a = dot(r, c), b = dot(r, c + 1);
            const taken = state.hEdges[idx];
            const isLast = last?.type === 'H' && last.index === idx;
            return <Edge key={`h${idx}`} a={a} b={b} taken={taken} isLast={isLast} myTurn={myTurn} onClick={() => !taken && send('H', idx)} />;
          })}
          {Array.from({ length: N * (N + 1) }).map((_, idx) => {
            const r = Math.floor(idx / (N + 1)), c = idx % (N + 1);
            const a = dot(r, c), b = dot(r + 1, c);
            const taken = state.vEdges[idx];
            const isLast = last?.type === 'V' && last.index === idx;
            return <Edge key={`v${idx}`} a={a} b={b} taken={taken} isLast={isLast} myTurn={myTurn} onClick={() => !taken && send('V', idx)} />;
          })}

          {Array.from({ length: (N + 1) * (N + 1) }).map((_, idx) => {
            const r = Math.floor(idx / (N + 1)), c = idx % (N + 1);
            const p = dot(r, c);
            return <circle key={`d${idx}`} cx={p.x} cy={p.y} r={4.5} fill="#f8fafc" stroke="#94a3b8" strokeWidth={1} />;
          })}
        </svg>
      </div>
    </div>
  );
}

function Edge({ a, b, taken, isLast, myTurn, onClick }: { a: { x: number; y: number }; b: { x: number; y: number }; taken: boolean; isLast: boolean; myTurn: boolean; onClick: () => void }) {
  if (taken) {
    return (
      <motion.line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={isLast ? '#fbbf24' : '#e2e8f0'} strokeWidth={5} strokeLinecap="round"
        initial={isLast ? { pathLength: 0 } : false} animate={{ pathLength: 1 }} transition={{ duration: 0.25 }} />
    );
  }
  return (
    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={myTurn ? '#64748b' : 'transparent'} strokeOpacity={0.3} strokeWidth={10} strokeLinecap="round"
      className={myTurn ? 'cursor-pointer hover:!stroke-primary hover:!stroke-opacity-100' : ''} onClick={onClick} />
  );
}
