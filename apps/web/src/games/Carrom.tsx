import { useEffect, useRef, useState } from 'react';
import { COIN_R, STRIKER_R, type CarromState } from '@play-nepal/shared';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

const B = 360; // board px
const FILL: Record<string, string> = { white: 'url(#cr-w)', black: 'url(#cr-b)', red: 'url(#cr-r)' };

export function Carrom({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as CarromState;
  const mySide = state.players.indexOf(myPlayerId);
  const myTurn = snapshot.turn === myPlayerId && !snapshot.result;
  const baseY = state.turn === 0 ? 0.84 : 0.16;

  const [strikerX, setStrikerX] = useState(0.5);
  const [aim, setAim] = useState<{ x: number; y: number } | null>(null);
  const [frameIdx, setFrameIdx] = useState<number | null>(null);
  const lastVer = useRef(snapshot.version);
  const svg = useRef<SVGSVGElement>(null);

  // Animate the shot through the engine's frames.
  useEffect(() => {
    if (snapshot.version === lastVer.current) return;
    lastVer.current = snapshot.version;
    if (!state.frames || state.frames.length === 0) { setFrameIdx(null); return; }
    let i = 0; setFrameIdx(0);
    const id = setInterval(() => {
      i++;
      if (i >= state.frames.length) { clearInterval(id); setFrameIdx(null); }
      else setFrameIdx(i);
    }, 26);
    return () => clearInterval(id);
  }, [snapshot.version, state.frames]);

  const animating = frameIdx !== null;
  const frame = animating ? state.frames[frameIdx!] : null;
  const canAim = myTurn && !animating && !pending;

  const toBoard = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };
  const release = () => {
    if (aim && canAim) {
      const dx = aim.x - strikerX, dy = aim.y - baseY;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.02) onMove({ x: strikerX, angle: Math.atan2(dy, dx), power: Math.min(1, dist * 2.4) });
    }
    setAim(null);
  };

  const coinAt = (i: number): [number, number] | null => {
    if (frame) return frame.c[i] ?? null;
    const c = state.coins[i]!;
    return c.pocketed ? null : [c.x, c.y];
  };
  const strikerPos: [number, number] | null = frame ? frame.s : [strikerX, baseY];

  return (
    <div className="mx-auto w-full max-w-sm space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className={cn('flex items-center gap-1.5', state.turn === 0 && 'font-bold')}><span className="h-3 w-3 rounded-full bg-zinc-100" /> {mySide === 0 ? 'You' : 'White'}: {state.pocketed.white}/9</span>
        {state.queenBy !== null && <span className="text-rose-400">👑 queen</span>}
        <span className={cn('flex items-center gap-1.5', state.turn === 1 && 'font-bold')}><span className="h-3 w-3 rounded-full bg-zinc-800 ring-1 ring-zinc-600" /> {mySide === 1 ? 'You' : 'Black'}: {state.pocketed.black}/9</span>
      </div>

      <svg ref={svg} viewBox="0 0 1 1" width={B} height={B} className="mx-auto block touch-none rounded-xl"
        onPointerDown={(e) => canAim && setAim(toBoard(e))}
        onPointerMove={(e) => aim && canAim && setAim(toBoard(e))}
        onPointerUp={release} onPointerLeave={() => aim && release()}>
        <defs>
          <radialGradient id="cr-w" cx="35%" cy="30%" r="70%"><stop offset="0%" stopColor="#fff" /><stop offset="100%" stopColor="#cbd5e1" /></radialGradient>
          <radialGradient id="cr-b" cx="35%" cy="30%" r="70%"><stop offset="0%" stopColor="#52525b" /><stop offset="100%" stopColor="#18181b" /></radialGradient>
          <radialGradient id="cr-r" cx="35%" cy="30%" r="70%"><stop offset="0%" stopColor="#fb7185" /><stop offset="100%" stopColor="#be123c" /></radialGradient>
          <radialGradient id="cr-s" cx="35%" cy="30%" r="70%"><stop offset="0%" stopColor="#fde68a" /><stop offset="100%" stopColor="#b45309" /></radialGradient>
        </defs>

        {/* board */}
        <rect x="0" y="0" width="1" height="1" rx="0.03" fill="#cf9a55" />
        <rect x="0.06" y="0.06" width="0.88" height="0.88" fill="none" stroke="#7c4a1e" strokeWidth="0.01" />
        <circle cx="0.5" cy="0.5" r="0.13" fill="none" stroke="#7c4a1e" strokeWidth="0.006" />
        {/* pockets */}
        {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="0.055" fill="#1c1008" />)}
        {/* baselines */}
        <line x1="0.15" y1="0.84" x2="0.85" y2="0.84" stroke="#7c4a1e" strokeWidth="0.006" />
        <line x1="0.15" y1="0.16" x2="0.85" y2="0.16" stroke="#7c4a1e" strokeWidth="0.006" />

        {/* coins */}
        {state.coins.map((c, i) => {
          const p = coinAt(i);
          return p ? <circle key={i} cx={p[0]} cy={p[1]} r={COIN_R} fill={FILL[c.type]} stroke="#00000055" strokeWidth="0.003" /> : null;
        })}

        {/* aim line */}
        {aim && canAim && strikerPos && (
          <line x1={strikerPos[0]} y1={strikerPos[1]} x2={aim.x} y2={aim.y} stroke="#22c55e" strokeWidth="0.008" strokeDasharray="0.02 0.015" />
        )}
        {/* striker */}
        {strikerPos && <circle cx={strikerPos[0]} cy={strikerPos[1]} r={STRIKER_R} fill="url(#cr-s)" stroke="#78350f" strokeWidth="0.004" />}
      </svg>

      {myTurn && !animating ? (
        <div className="space-y-1">
          <input type="range" min={0.15} max={0.85} step={0.01} value={strikerX} onChange={(e) => setStrikerX(Number(e.target.value))} className="w-full" />
          <p className="text-center text-xs text-muted-foreground">Slide to position the striker · drag on the board to aim & flick</p>
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">{animating ? 'Coins in motion…' : 'Opponent’s turn…'}</p>
      )}
    </div>
  );
}
