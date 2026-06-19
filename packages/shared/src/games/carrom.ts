import type { GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';

// ─────────────────────────────────────────────────────────────
// Carrom — a deterministic 2D physics game. Flick the striker to
// pocket your coins. The engine simulates the shot (collisions,
// friction, pocketing) and records animation frames for the client.
// All coordinates are normalised to a 0–1 board.
// ─────────────────────────────────────────────────────────────

export const COIN_R = 0.032;
export const STRIKER_R = 0.042;
const POCKET_R = 0.055;
const FRICTION = 0.985;
const WALL_REST = 0.82;
const COIN_REST = 0.92;
const MAX_STEPS = 800;
const STOP_VEL = 0.0006;
const MAX_SPEED = 0.07;
const POCKETS: Array<[number, number]> = [[0, 0], [1, 0], [0, 1], [1, 1]];

export type CoinType = 'white' | 'black' | 'red';
export interface CarromCoin { x: number; y: number; vx: number; vy: number; type: CoinType; pocketed: boolean }
export interface CarromFrame { s: [number, number] | null; c: Array<[number, number] | null> }

export interface CarromState {
  coins: CarromCoin[];
  striker: { x: number; y: number };
  turn: number; // 0 = white (bottom), 1 = black (top)
  players: string[];
  pocketed: { white: number; black: number };
  queenBy: number | null;
  foul: boolean;
  lastPocketed: CoinType[];
  winner: number | null;
  frames: CarromFrame[];
}

export interface CarromMove {
  x: number;     // striker position along the baseline (0.15–0.85)
  angle: number; // aim direction (radians)
  power: number; // 0–1
}

export const carromMeta: GameMeta = {
  id: 'carrom',
  name: 'Carrom',
  category: 'BOARD',
  minPlayers: 2,
  maxPlayers: 2,
  supportsAI: false,
  supportsSpectators: true,
  ranked: false,
  shortDescription: 'Flick the striker, pocket your coins — real physics on the board.',
  status: 'live',
};

function layout(): CarromCoin[] {
  const coins: CarromCoin[] = [{ x: 0.5, y: 0.5, vx: 0, vy: 0, type: 'red', pocketed: false }];
  const add = (r: number, count: number, off: number) => {
    for (let k = 0; k < count; k++) {
      const a = off + (k / count) * Math.PI * 2;
      coins.push({ x: 0.5 + Math.cos(a) * r, y: 0.5 + Math.sin(a) * r, vx: 0, vy: 0, type: k % 2 === 0 ? 'white' : 'black', pocketed: false });
    }
  };
  add(COIN_R * 2.15, 6, 0);
  add(COIN_R * 4.2, 12, Math.PI / 12);
  return coins;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const snap = (sActive: boolean, sx: number, sy: number, coins: CarromCoin[]): CarromFrame => ({
  s: sActive ? [+sx.toFixed(3), +sy.toFixed(3)] : null,
  c: coins.map((c) => (c.pocketed ? null : [+c.x.toFixed(3), +c.y.toFixed(3)] as [number, number])),
});

interface Body { x: number; y: number; vx: number; vy: number; r: number; pocketed: boolean }

/** Run one shot; returns the resulting coins, foul flag, and frames. */
function simulate(coins: CarromCoin[], move: CarromState, params: { x: number; angle: number; power: number; turn: number }) {
  const next = coins.map((c) => ({ ...c }));
  const sp = clamp(params.power, 0.05, 1) * MAX_SPEED;
  const striker: Body = {
    x: clamp(params.x, 0.15, 0.85), y: params.turn === 0 ? 0.84 : 0.16,
    vx: Math.cos(params.angle) * sp, vy: Math.sin(params.angle) * sp, r: STRIKER_R, pocketed: false,
  };
  const frames: CarromFrame[] = [];
  void move;

  for (let stepN = 0; stepN < MAX_STEPS; stepN++) {
    const bodies: Body[] = [];
    if (!striker.pocketed) bodies.push(striker);
    for (const c of next) if (!c.pocketed) bodies.push(c as unknown as Body);

    for (const b of bodies) { b.x += b.vx; b.y += b.vy; }
    for (const b of bodies) {
      const r = b.r ?? COIN_R;
      if (b.x < r) { b.x = r; b.vx = -b.vx * WALL_REST; }
      if (b.x > 1 - r) { b.x = 1 - r; b.vx = -b.vx * WALL_REST; }
      if (b.y < r) { b.y = r; b.vy = -b.vy * WALL_REST; }
      if (b.y > 1 - r) { b.y = 1 - r; b.vy = -b.vy * WALL_REST; }
    }
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const A = bodies[i]!, B = bodies[j]!;
        const ra = A.r ?? COIN_R, rb = B.r ?? COIN_R;
        const dx = B.x - A.x, dy = B.y - A.y;
        const dist = Math.hypot(dx, dy) || 1e-6;
        const minD = ra + rb;
        if (dist < minD) {
          const nx = dx / dist, ny = dy / dist;
          const overlap = (minD - dist) / 2;
          A.x -= nx * overlap; A.y -= ny * overlap; B.x += nx * overlap; B.y += ny * overlap;
          const vn = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
          if (vn < 0) {
            const imp = (-(1 + COIN_REST) * vn) / 2;
            A.vx -= imp * nx; A.vy -= imp * ny; B.vx += imp * nx; B.vy += imp * ny;
          }
        }
      }
    }
    let maxV = 0;
    for (const b of bodies) {
      b.vx *= FRICTION; b.vy *= FRICTION;
      const r = b.r ?? COIN_R;
      for (const [px, py] of POCKETS) if (Math.hypot(b.x - px, b.y - py) < POCKET_R - r * 0.3) { b.pocketed = true; b.vx = 0; b.vy = 0; }
      maxV = Math.max(maxV, Math.hypot(b.vx, b.vy));
    }
    if (stepN % 10 === 0) frames.push(snap(!striker.pocketed, striker.x, striker.y, next));
    if (maxV < STOP_VEL) break;
  }
  frames.push(snap(!striker.pocketed, striker.x, striker.y, next));
  return { coins: next, foul: striker.pocketed, frames };
}

const sideOf = (s: CarromState, pid: string): number => s.players.indexOf(pid);

export const carrom: GameEngine<CarromState, CarromMove> = {
  meta: carromMeta,

  createInitialState(players: PlayerSlot[]): CarromState {
    const w = players.find((p) => p.seat === 0);
    const b = players.find((p) => p.seat === 1);
    return {
      coins: layout(),
      striker: { x: 0.5, y: 0.84 },
      turn: 0,
      players: [w?.playerId ?? 'seat-0', b?.playerId ?? 'seat-1'],
      pocketed: { white: 0, black: 0 },
      queenBy: null,
      foul: false,
      lastPocketed: [],
      winner: null,
      frames: [],
    };
  },

  currentTurn(state) {
    return state.winner !== null ? null : state.players[state.turn] ?? null;
  },

  legalMoves(state, playerId) {
    if (state.winner !== null || state.players[state.turn] !== playerId) return [];
    return [{ x: 0.5, angle: state.turn === 0 ? -Math.PI / 2 : Math.PI / 2, power: 0.6 }];
  },

  applyMove(state, move, playerId): MoveResult<CarromState> {
    if (state.winner !== null) return fail('Game is over.');
    const side = sideOf(state, playerId);
    if (side !== state.turn) return fail('Not your turn.');

    const before = state.coins.map((c) => c.pocketed);
    const sim = simulate(state.coins, state, { x: move.x, angle: move.angle, power: move.power, turn: state.turn });

    const next = clone(state);
    next.coins = sim.coins;
    next.foul = sim.foul;
    next.frames = sim.frames;
    next.striker = { x: clamp(move.x, 0.15, 0.85), y: state.turn === 0 ? 0.84 : 0.16 };

    const justPocketed: CoinType[] = [];
    next.coins.forEach((c, i) => { if (c.pocketed && !before[i]) justPocketed.push(c.type); });
    next.lastPocketed = justPocketed;
    const myColor: CoinType = state.turn === 0 ? 'white' : 'black';
    next.pocketed.white = next.coins.filter((c) => c.type === 'white' && c.pocketed).length;
    next.pocketed.black = next.coins.filter((c) => c.type === 'black' && c.pocketed).length;
    if (justPocketed.includes('red') && next.queenBy === null) next.queenBy = state.turn;

    const pocketedMine = justPocketed.filter((t) => t === myColor).length;
    // Win: pocket all 9 of your colour.
    if (next.pocketed[myColor] >= 9) { next.winner = state.turn; return ok(next); }

    if (sim.foul || pocketedMine === 0) next.turn = state.turn === 0 ? 1 : 0; // miss / foul → opponent
    // else: pocketed your own → shoot again (turn unchanged)
    return ok(next);
  },

  getResult(state): GameResult | null {
    if (state.winner === null) return null;
    return {
      winnerId: state.players[state.winner],
      draw: false,
      scores: { white: state.pocketed.white, black: state.pocketed.black },
      reason: 'Pocketed all coins' + (state.queenBy === state.winner ? ' (with the queen!)' : ''),
    };
  },
};
