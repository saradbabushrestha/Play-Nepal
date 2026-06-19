import { motion } from 'framer-motion';
import type { SpinWheelState } from '@play-nepal/shared';
import { Button } from '@/components/ui';
import type { GameBoardProps } from './types';

const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#f43f5e', '#8b5cf6', '#10b981'];

export function SpinWheel({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as SpinWheelState;
  const n = state.names.length;
  const seg = 360 / n;
  const isHost = state.players[0] === myPlayerId;
  const R = 150;
  const cx = 160, cy = 160;

  // Land the chosen segment under the top pointer.
  const targetRotation = state.spun && state.result !== null
    ? state.turns * 360 + (360 - (state.result * seg + seg / 2))
    : 0;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4">
      <div className="relative">
        <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1 text-3xl">🔻</div>
        <motion.svg width={320} height={320} viewBox="0 0 320 320"
          animate={{ rotate: targetRotation }}
          transition={{ duration: state.spun ? 4 : 0, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: 'center' }}
        >
          {state.names.map((name, i) => {
            const a0 = (i * seg - 90) * (Math.PI / 180);
            const a1 = ((i + 1) * seg - 90) * (Math.PI / 180);
            const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
            const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
            const mid = (a0 + a1) / 2;
            const tx = cx + R * 0.62 * Math.cos(mid), ty = cy + R * 0.62 * Math.sin(mid);
            return (
              <g key={i}>
                <path d={`M ${cx} ${cy} L ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1} Z`} fill={COLORS[i % COLORS.length]} stroke="#0f172a" strokeWidth={2} />
                <text x={tx} y={ty} fill="#fff" fontSize="13" fontWeight="700" textAnchor="middle" dominantBaseline="middle"
                  transform={`rotate(${i * seg + seg / 2}, ${tx}, ${ty})`}>
                  {name.length > 9 ? name.slice(0, 8) + '…' : name}
                </text>
              </g>
            );
          })}
          <circle cx={cx} cy={cy} r={20} fill="#0f172a" stroke="#fff" strokeWidth={3} />
        </motion.svg>
      </div>

      {state.spun && state.result !== null ? (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">The wheel chose</p>
          <p className="text-2xl font-extrabold text-gradient">🎯 {state.names[state.result]}</p>
        </div>
      ) : isHost ? (
        <Button size="lg" disabled={pending} onClick={() => onMove({ type: 'spin' })}>🎡 Spin the wheel</Button>
      ) : (
        <p className="text-sm text-muted-foreground">Waiting for the host to spin…</p>
      )}
    </div>
  );
}
