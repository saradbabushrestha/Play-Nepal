import { useRef } from 'react';
import { motion } from 'framer-motion';
import { getEngine, LUDO_ENTRIES, LUDO_SAFE, LUDO_HOME, type LudoState, type LudoMove } from '@play-nepal/shared';
import { Button } from '@/components/ui';
import { Dice } from '@/components/game/Dice';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

const eng = getEngine('ludo')!;
const COLORS = ['#ef4444', '#22c55e', '#eab308', '#3b82f6']; // red, green, yellow, blue
const CELL = 26;
const G = 15;
const SIZE = G * CELL;

// Canonical 52-cell Ludo path on a 15×15 grid, [row, col].
const PATH: Array<[number, number]> = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7],
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14],
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7],
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0], [6, 0],
];
const HOME_COL: Array<Array<[number, number]>> = [
  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
];
const HOME_CENTER: Array<[number, number]> = [[7, 6], [6, 7], [7, 8], [8, 7]];
const BASE_CORNER: Array<[number, number]> = [[0, 0], [0, 9], [9, 9], [9, 0]]; // [row0, col0]
const BASE_SLOTS = BASE_CORNER.map(([r0, c0]) =>
  [[c0 + 1.5, r0 + 1.5], [c0 + 3.5, r0 + 1.5], [c0 + 1.5, r0 + 3.5], [c0 + 3.5, r0 + 3.5]] as Array<[number, number]>,
);

const cc = (r: number, c: number) => ({ x: (c + 0.5) * CELL, y: (r + 0.5) * CELL });

function tokenXY(state: LudoState, p: number, t: number, rel: number) {
  if (rel < 0) { const [col, row] = BASE_SLOTS[p]![t]!; return { x: col * CELL, y: row * CELL }; }
  if (rel <= 50) { const [r, c] = PATH[(state.entries[p]! + rel) % 52]!; return cc(r, c); }
  if (rel <= 55) { const [r, c] = HOME_COL[p]![rel - 51]!; return cc(r, c); }
  const [r, c] = HOME_CENTER[p]!; return cc(r, c);
}

export function Ludo({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as LudoState;
  const prev = useRef<number[][] | null>(null);
  const mySeat = state.players.indexOf(myPlayerId);
  const myTurn = snapshot.turn === myPlayerId && !snapshot.result;
  const legal = (myTurn ? eng.legalMoves(state, myPlayerId) : []) as LudoMove[];
  const canRoll = myTurn && state.phase === 'roll' && legal.some((m) => m.type === 'roll');
  const movable = new Set(legal.filter((m): m is { type: 'move'; token: number } => m.type === 'move').map((m) => m.token));

  const prevTokens = prev.current;
  prev.current = state.tokens.map((t) => [...t]);

  return (
    <div className="mx-auto w-full max-w-md space-y-3">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full rounded-2xl shadow-2xl" style={{ background: '#0f172a' }}>
        <defs>
          {COLORS.map((c, i) => (
            <radialGradient key={i} id={`lt-${i}`} cx="34%" cy="28%" r="80%">
              <stop offset="0%" stopColor="#fff" /><stop offset="42%" stopColor={c} /><stop offset="100%" stopColor="#000" stopOpacity={0.55} />
            </radialGradient>
          ))}
        </defs>

        {/* bases */}
        {state.players.map((_, p) => {
          const [r0, c0] = BASE_CORNER[p]!;
          return (
            <g key={`base${p}`}>
              <rect x={c0 * CELL + 2} y={r0 * CELL + 2} width={6 * CELL - 4} height={6 * CELL - 4} rx={12} fill={COLORS[p]} />
              <rect x={(c0 + 1) * CELL} y={(r0 + 1) * CELL} width={4 * CELL} height={4 * CELL} rx={8} fill="#f8fafc" />
              {BASE_SLOTS[p]!.map(([col, row], t) => (
                <circle key={t} cx={col * CELL} cy={row * CELL} r={10} fill="none" stroke={COLORS[p]} strokeWidth={2} strokeOpacity={0.6} />
              ))}
            </g>
          );
        })}

        {/* path cells */}
        {PATH.map(([r, c], g) => {
          const { x, y } = cc(r, c);
          const startOwner = LUDO_ENTRIES.indexOf(g);
          return (
            <g key={`p${g}`}>
              <rect x={x - CELL / 2 + 1} y={y - CELL / 2 + 1} width={CELL - 2} height={CELL - 2} rx={3}
                fill={startOwner >= 0 ? COLORS[startOwner] : '#e2e8f0'} fillOpacity={startOwner >= 0 ? 0.85 : 1} stroke="#94a3b8" strokeWidth={0.5} />
              {LUDO_SAFE.has(g) && startOwner < 0 && <text x={x} y={y + 4} textAnchor="middle" fontSize="12" fill="#475569">★</text>}
            </g>
          );
        })}

        {/* home lanes */}
        {HOME_COL.map((cells, p) => cells.map(([r, c], k) => {
          const { x, y } = cc(r, c);
          return <rect key={`hc${p}-${k}`} x={x - CELL / 2 + 1} y={y - CELL / 2 + 1} width={CELL - 2} height={CELL - 2} rx={3} fill={COLORS[p]} fillOpacity={0.7} />;
        }))}

        {/* centre home with 4 triangles pointing inward */}
        <g>
          {state.players.map((_, p) => {
            const cen = cc(7, 7);
            const corners: Record<number, [number, number][]> = {
              0: [[6 * CELL, 6 * CELL], [6 * CELL, 9 * CELL]], // left → red
              1: [[6 * CELL, 6 * CELL], [9 * CELL, 6 * CELL]], // top → green
              2: [[9 * CELL, 6 * CELL], [9 * CELL, 9 * CELL]], // right → yellow
              3: [[6 * CELL, 9 * CELL], [9 * CELL, 9 * CELL]], // bottom → blue
            };
            const [a, b] = corners[p]!;
            return <polygon key={p} points={`${a[0]},${a[1]} ${b[0]},${b[1]} ${cen.x},${cen.y}`} fill={COLORS[p]} fillOpacity={0.85} stroke="#0f172a" strokeWidth={1} />;
          })}
          <circle cx={cc(7, 7).x} cy={cc(7, 7).y} r={6} fill="#0f172a" />
        </g>

        {/* tokens — hop along the path when they move */}
        {state.tokens.flatMap((toks, p) =>
          toks.map((rel, t) => {
            const fromRel = prevTokens?.[p]?.[t];
            let keysX: number[] = [];
            let keysY: number[] = [];
            const cur = tokenXY(state, p, t, rel);
            if (fromRel !== undefined && fromRel !== rel && fromRel >= 0 && rel > fromRel && rel <= 56) {
              for (let s = fromRel; s <= rel; s++) { const xy = tokenXY(state, p, t, s); keysX.push(xy.x); keysY.push(xy.y); }
            } else if (fromRel !== undefined && fromRel === -1 && rel >= 0) {
              const a = tokenXY(state, p, t, -1); keysX = [a.x, cur.x]; keysY = [a.y, cur.y];
            } else {
              keysX = [cur.x]; keysY = [cur.y];
            }
            const steps = Math.max(1, keysX.length - 1);
            const movableHere = p === mySeat && movable.has(t);
            return (
              <motion.g
                key={`${p}-${t}`}
                initial={false}
                animate={{ x: keysX, y: keysY }}
                transition={{ duration: Math.min(1.1, steps * 0.16), ease: 'easeInOut' }}
                onClick={() => movableHere && !pending && onMove({ type: 'move', token: t })}
                className={movableHere ? 'cursor-pointer' : ''}
              >
                <ellipse cx={0} cy={7} rx={7} ry={2.5} fill="#000" opacity={0.25} />
                <circle cx={0} cy={0} r={9} fill={`url(#lt-${p})`} stroke={movableHere ? '#fff' : '#0f172a'} strokeWidth={movableHere ? 2.5 : 1} className={movableHere ? 'animate-pulse' : ''} />
              </motion.g>
            );
          }),
        )}
      </svg>

      <div className="flex items-center justify-center gap-3">
        <Dice value={state.lastRoll} rollId={state.rollCount} size={46} />
        <Button disabled={!canRoll || pending} onClick={() => onMove({ type: 'roll' })}>
          {state.phase === 'roll' ? (myTurn ? 'Roll' : 'Waiting…') : myTurn ? 'Move a token →' : 'Waiting…'}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {state.players.map((_, p) => (
          <div key={p} className={cn('flex items-center gap-1.5 rounded-lg px-2 py-1', snapshot.turn === state.players[p] && !snapshot.result && 'bg-secondary')}>
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: COLORS[p % 4] }} />
            <span className="w-9 shrink-0 text-xs text-muted-foreground">{p === mySeat ? 'You' : `P${p + 1}`}</span>
            <div className="flex flex-wrap gap-1">
              {state.tokens[p]!.map((rel, t) => {
                const canMove = p === mySeat && movable.has(t);
                const label = rel === -1 ? '⌂' : rel === LUDO_HOME ? '✓' : rel > 50 ? `h${rel - 50}` : `${rel}`;
                return (
                  <button key={t} disabled={!canMove || pending} onClick={() => onMove({ type: 'move', token: t })}
                    className={cn('h-6 w-6 rounded-md border text-[10px] font-bold', canMove ? 'border-primary bg-primary/15 text-primary animate-pulse' : 'border-border text-muted-foreground', rel === LUDO_HOME && 'text-emerald-400')}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
