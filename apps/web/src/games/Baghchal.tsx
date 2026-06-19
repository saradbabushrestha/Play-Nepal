import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BAGHCHAL_NEIGHBORS, type BaghchalState, type Side } from '@play-nepal/shared';
import { Badge } from '@/components/ui';
import type { GameBoardProps } from './types';

const PAD = 44;
const STEP = 78;
const xy = (i: number) => ({ x: PAD + (i % 5) * STEP, y: PAD + Math.floor(i / 5) * STEP });
const VB = PAD * 2 + STEP * 4;

const EDGES: Array<[number, number]> = (() => {
  const out: Array<[number, number]> = [];
  BAGHCHAL_NEIGHBORS.forEach((nbrs, i) => nbrs.forEach((j) => { if (j > i) out.push([i, j]); }));
  return out;
})();

function midpoint(from: number, to: number): number | null {
  const fr = Math.floor(from / 5), fc = from % 5;
  const tr = Math.floor(to / 5), tc = to % 5;
  if ((fr + tr) % 2 !== 0 || (fc + tc) % 2 !== 0) return null;
  return ((fr + tr) / 2) * 5 + (fc + tc) / 2;
}

export function Baghchal({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as BaghchalState;
  const [selected, setSelected] = useState<number | null>(null);

  const mySide: Side | null =
    state.players.TIGER === myPlayerId ? 'TIGER' : state.players.GOAT === myPlayerId ? 'GOAT' : null;
  const myTurn = snapshot.turn === myPlayerId && !snapshot.result;

  const targets = useMemo(() => {
    if (selected === null) return new Set<number>();
    const set = new Set<number>();
    for (const j of BAGHCHAL_NEIGHBORS[selected]) if (state.board[j] === 'EMPTY') set.add(j);
    if (mySide === 'TIGER') {
      for (const over of BAGHCHAL_NEIGHBORS[selected]) {
        if (state.board[over] !== 'GOAT') continue;
        const or = Math.floor(over / 5), oc = over % 5;
        const sr = Math.floor(selected / 5), sc = selected % 5;
        const lr = or + (or - sr), lc = oc + (oc - sc);
        if (lr < 0 || lr > 4 || lc < 0 || lc > 4) continue;
        const land = lr * 5 + lc;
        if (BAGHCHAL_NEIGHBORS[over].includes(land) && state.board[land] === 'EMPTY') set.add(land);
      }
    }
    return set;
  }, [selected, state.board, mySide]);

  function clickPoint(i: number) {
    if (!myTurn || pending) return;
    const piece = state.board[i];
    if (mySide === 'GOAT' && state.phase === 'placement') {
      if (piece === 'EMPTY') onMove({ type: 'place', to: i });
      return;
    }
    const mine = mySide === 'TIGER' ? 'TIGER' : 'GOAT';
    if (selected === null) { if (piece === mine) setSelected(i); return; }
    if (i === selected) return setSelected(null);
    if (piece === mine) return setSelected(i);
    if (BAGHCHAL_NEIGHBORS[selected].includes(i) && piece === 'EMPTY') onMove({ type: 'move', from: selected, to: i });
    else if (mySide === 'TIGER' && piece === 'EMPTY') {
      const over = midpoint(selected, i);
      if (over !== null && state.board[over] === 'GOAT') onMove({ type: 'capture', from: selected, over, to: i });
    }
    setSelected(null);
  }

  const last = state.lastMove;
  const captureOver = last && last.type === 'capture' ? last.over : null;

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="surface-wood rounded-2xl p-3 shadow-2xl ring-1 ring-amber-950/40">
        <svg viewBox={`0 0 ${VB} ${VB}`} className="w-full">
          <defs>
            <radialGradient id="bg-tiger" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#ffe0a3" /><stop offset="45%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#a8530a" />
            </radialGradient>
            <radialGradient id="bg-goat" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#ffffff" /><stop offset="55%" stopColor="#ece6d6" /><stop offset="100%" stopColor="#b3a98f" />
            </radialGradient>
            <filter id="bg-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#3a1d05" floodOpacity="0.55" />
            </filter>
          </defs>

          {/* engraved board lines */}
          {EDGES.map(([a, b], k) => {
            const p1 = xy(a), p2 = xy(b);
            return <line key={k} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#4a2d10" strokeOpacity={0.55} strokeWidth={3} strokeLinecap="round" />;
          })}

          {/* points + pieces */}
          {state.board.map((piece, i) => {
            const { x, y } = xy(i);
            const isTarget = targets.has(i);
            const isSelected = selected === i;
            const lastTo = last && 'to' in last ? last.to : -1;
            const fromXY = last && 'from' in last ? xy((last as { from: number }).from) : null;
            return (
              <g key={i} onClick={() => clickPoint(i)} className={myTurn ? 'cursor-pointer' : ''}>
                {/* carved node */}
                <circle cx={x} cy={y} r={9} fill="#3a230d" fillOpacity={0.4} />
                <circle cx={x} cy={y} r={7} fill="#caa05f" />
                {isTarget && <circle cx={x} cy={y} r={24} fill="#34d399" fillOpacity={0.18} stroke="#34d399" strokeWidth={2.5} className="hint-pulse" style={{ transformOrigin: `${x}px ${y}px` }} />}
                {lastTo === i && <circle cx={x} cy={y} r={28} fill="none" stroke="#fbbf24" strokeWidth={2.5} strokeDasharray="5 4" />}
                <AnimatePresence>
                  {piece !== 'EMPTY' && (
                    <motion.g
                      key={`${piece}-${i}`}
                      initial={fromXY && lastTo === i ? { x: fromXY.x - x, y: fromXY.y - y } : { scale: 0 }}
                      animate={{ x: 0, y: 0, scale: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                    >
                      <ellipse cx={x} cy={y + 20} rx={17} ry={5} fill="#000" opacity={0.25} />
                      <circle cx={x} cy={y} r={22} fill={piece === 'TIGER' ? 'url(#bg-tiger)' : 'url(#bg-goat)'} filter="url(#bg-shadow)" stroke={isSelected ? '#f43f5e' : piece === 'TIGER' ? '#7c3a06' : '#9c937b'} strokeWidth={isSelected ? 4 : 1.5} />
                      <text x={x} y={y + 7} textAnchor="middle" fontSize="22" style={{ userSelect: 'none' }}>{piece === 'TIGER' ? '🐯' : '🐐'}</text>
                    </motion.g>
                  )}
                </AnimatePresence>
                {captureOver === i && (
                  <motion.text key={`puff-${state.goatsCaptured}`} x={x} y={y} textAnchor="middle" fontSize="26"
                    initial={{ scale: 0.4, opacity: 1 }} animate={{ scale: 1.8, opacity: 0 }} transition={{ duration: 0.7 }}>💥</motion.text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          You are <b className={mySide === 'TIGER' ? 'text-amber-500' : 'text-zinc-200'}>{mySide === 'TIGER' ? '🐯 Tigers' : '🐐 Goats'}</b>
        </span>
        <div className="flex items-center gap-2">
          <Badge variant={state.goatsCaptured > 0 ? 'accent' : 'muted'}>Captured {state.goatsCaptured}/5</Badge>
          {state.phase === 'placement' && <Badge variant="muted">Placed {state.goatsPlaced}/20</Badge>}
        </div>
      </div>
    </div>
  );
}
