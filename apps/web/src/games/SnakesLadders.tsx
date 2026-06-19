import { useRef } from 'react';
import { motion } from 'framer-motion';
import { LADDERS, SNAKES, type SnakesState } from '@play-nepal/shared';
import { Button } from '@/components/ui';
import { Dice, ROLL_MS } from '@/components/game/Dice';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308'];
const C = 60;

function cell(n: number) {
  const rfb = Math.floor((n - 1) / 10);
  const idx = (n - 1) % 10;
  const col = rfb % 2 === 0 ? idx : 9 - idx;
  const rft = 9 - rfb;
  return { x: col * C + C / 2, y: rft * C + C / 2 };
}

function Ladder({ from, to }: { from: number; to: number }) {
  const a = cell(from), b = cell(to);
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
  const px = (-dy / len) * 8, py = (dx / len) * 8;
  const rungs = Math.max(2, Math.round(len / 26));
  return (
    <g stroke="#b45309" strokeWidth={4} strokeLinecap="round">
      <line x1={a.x + px} y1={a.y + py} x2={b.x + px} y2={b.y + py} />
      <line x1={a.x - px} y1={a.y - py} x2={b.x - px} y2={b.y - py} />
      {Array.from({ length: rungs }).map((_, i) => {
        const t = (i + 0.5) / rungs;
        const cx = a.x + dx * t, cy = a.y + dy * t;
        return <line key={i} x1={cx + px} y1={cy + py} x2={cx - px} y2={cy - py} strokeWidth={3} />;
      })}
    </g>
  );
}

function Snake({ from, to }: { from: number; to: number }) {
  const a = cell(from), b = cell(to);
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
  const px = (-dy / len) * 26, py = (dx / len) * 26;
  const d = `M ${a.x} ${a.y} Q ${mx + px} ${my + py} ${b.x} ${b.y}`;
  return (
    <g>
      <path d={d} fill="none" stroke="#16a34a" strokeWidth={9} strokeLinecap="round" opacity={0.9} />
      <path d={d} fill="none" stroke="#bbf7d0" strokeWidth={2.5} strokeLinecap="round" strokeDasharray="2 11" />
      <circle cx={a.x} cy={a.y} r={10} fill="#15803d" stroke="#bbf7d0" strokeWidth={1.5} />
      <text x={a.x} y={a.y + 5} textAnchor="middle" fontSize="13">🐍</text>
    </g>
  );
}

export function SnakesLadders({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as SnakesState;
  const prev = useRef<number[] | null>(null);
  const mySeat = state.players.indexOf(myPlayerId);
  const myTurn = snapshot.turn === myPlayerId && !snapshot.result;

  const prevPos = prev.current;
  const moved = prevPos ? state.positions.findIndex((p, i) => p !== prevPos[i]) : -1;
  prev.current = [...state.positions];

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-4 sm:grid-cols-[1fr_170px]">
      <svg viewBox={`0 0 ${C * 10} ${C * 10}`} className="w-full rounded-xl border border-border shadow-xl">
        <defs>
          {COLORS.map((c, i) => (
            <radialGradient key={i} id={`sl-${i}`} cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#fff" /><stop offset="40%" stopColor={c} /><stop offset="100%" stopColor="#000" stopOpacity={0.5} />
            </radialGradient>
          ))}
        </defs>
        {Array.from({ length: 100 }).map((_, k) => {
          const n = k + 1;
          const { x, y } = cell(n);
          const dark = (Math.floor(x / C) + Math.floor(y / C)) % 2 === 0;
          return (
            <g key={n}>
              <rect x={x - C / 2} y={y - C / 2} width={C} height={C} fill={dark ? '#1e293b' : '#0f172a'} stroke="#334155" strokeWidth={0.5} />
              <text x={x - C / 2 + 5} y={y - C / 2 + 14} fontSize="10" fill="#64748b">{n}</text>
            </g>
          );
        })}
        {Object.entries(LADDERS).map(([f, t]) => <Ladder key={`l${f}`} from={+f} to={t} />)}
        {Object.entries(SNAKES).map(([f, t]) => <Snake key={`s${f}`} from={+f} to={t} />)}

        {state.positions.map((pos, i) => {
          if (pos <= 0 && moved !== i) return null;
          const offX = (i % 2) * 14 - 7, offY = Math.floor(i / 2) * 14 - 7;
          let keysX: number[] = [];
          let keysY: number[] = [];
          if (moved === i) {
            const roll = state.lastRoll ?? 0;
            const jump = state.lastJump;
            const landing = jump ? jump.from : pos;
            const start = Math.max(1, landing - roll);
            const walk: number[] = [];
            for (let n = start; n <= landing; n++) walk.push(n);
            if (jump) walk.push(jump.to);
            keysX = walk.map((n) => cell(n).x);
            keysY = walk.map((n) => cell(n).y);
          } else {
            keysX = [cell(pos).x];
            keysY = [cell(pos).y];
          }
          const steps = Math.max(1, keysX.length - 1);
          return (
            <motion.g
              key={i}
              initial={false}
              animate={{ x: keysX, y: keysY }}
              transition={moved === i ? { delay: ROLL_MS / 1000, duration: Math.min(1.4, steps * 0.18), ease: 'easeInOut' } : { duration: 0 }}
            >
              <ellipse cx={offX} cy={offY + 7} rx={7} ry={2.5} fill="#000" opacity={0.3} />
              <circle cx={offX} cy={offY} r={9} fill={`url(#sl-${i})`} stroke="#fff" strokeWidth={1.5} />
            </motion.g>
          );
        })}
      </svg>

      <div className="space-y-3">
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3">
          <Dice value={state.lastRoll} rollId={state.rollCount} size={54} />
          {state.lastJump && (
            <p className={cn('text-xs font-semibold', state.lastJump.kind === 'ladder' ? 'text-amber-400' : 'text-emerald-400')}>
              {state.lastJump.kind === 'ladder' ? '🪜 climbed' : '🐍 slid'} {state.lastJump.from}→{state.lastJump.to}
            </p>
          )}
          <Button className="w-full" disabled={!myTurn || pending} onClick={() => onMove({ type: 'roll' })}>
            {myTurn ? 'Roll dice' : 'Waiting…'}
          </Button>
        </div>
        <div className="space-y-1.5">
          {state.players.map((_, i) => (
            <div key={i} className={cn('flex items-center justify-between rounded-lg px-2 py-1 text-sm', snapshot.turn === state.players[i] && !snapshot.result && 'bg-secondary')}>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: COLORS[i] }} />
                {i === mySeat ? 'You' : `Player ${i + 1}`}
              </span>
              <b className="tabular-nums">{state.positions[i]}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
