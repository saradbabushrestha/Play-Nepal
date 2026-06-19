# Adding a new game

The whole platform is built so that **adding a game touches only two or three files** — never auth, rooms, sockets, persistence, matchmaking, leaderboards, or chat. They all work the moment your engine is registered.

## The three steps

### 1. Implement the engine (`packages/shared/src/games/<game>.ts`)

Implement `GameEngine<State, Move>` ([interface](../packages/shared/src/games/engine.ts)). Keep it **pure** (no IO, no `Date.now()`/`Math.random()` unless seeded through state) and **immutable** (`clone` then mutate the copy — helpers are exported from `engine.ts`).

```ts
import { clone, fail, ok, type GameEngine } from './engine.js';
import type { GameMeta } from '../types.js';

export interface DotsState { /* serializable */ }
export interface DotsMove { /* serializable */ }

export const dotsMeta: GameMeta = {
  id: 'dots-and-boxes',
  name: 'Dots and Boxes',
  category: 'BOARD',
  minPlayers: 2, maxPlayers: 2,
  supportsAI: true, supportsSpectators: true, ranked: true,
  shortDescription: 'Claim the most boxes.',
  status: 'live',
};

export const dotsAndBoxes: GameEngine<DotsState, DotsMove> = {
  meta: dotsMeta,
  createInitialState(players) { /* assign seats → playerIds */ },
  currentTurn(state) { /* return engine playerId or null */ },
  legalMoves(state, playerId) { /* for validation + AI */ },
  applyMove(state, move, playerId) {
    // validate; on success: const next = clone(state); ...; return ok(next);
    // on failure: return fail('why');
  },
  getResult(state) { /* null until terminal, else { winnerId, draw, ... } */ },
  aiMove(state, playerId, difficulty) { /* optional */ },
  // viewFor(state, viewer) — only for hidden-information games
};
```

### 2. Register it (`packages/shared/src/games/registry.ts`)

```ts
import { dotsAndBoxes } from './dots-and-boxes.js';

export const ENGINES = {
  // ...existing
  [dotsAndBoxes.meta.id]: dotsAndBoxes,
};
```

Add it to the catalogue in [`catalog.ts`](../packages/shared/src/catalog.ts) (or flip its `status` from `planned` to `live`) and export its types from [`index.ts`](../packages/shared/src/index.ts). Re-run the seed (`npm run prisma:seed`) so the `Game` row updates.

### 3. Build the board UI (`apps/web/src/games/<Game>.tsx`)

A board is a **pure renderer** of the snapshot plus an `onMove` callback:

```tsx
import type { GameBoardProps } from './types';

export function DotsAndBoxes({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as DotsState;
  const myTurn = snapshot.turn === myPlayerId && !snapshot.result;
  // render state; on interaction: onMove({ ... })
}
```

Wire it into the switch in [`GameView.tsx`](../apps/web/src/games/GameView.tsx):

```ts
const BOARDS = { /* ... */ 'dots-and-boxes': DotsAndBoxes };
```

Optionally add an emoji in `emojiFor` ([`Landing.tsx`](../apps/web/src/pages/Landing.tsx)).

## That's it

What you get for free, with zero extra work:
- Room create/join by code, public/private/password, spectators, host controls
- Realtime sync, reconnection, authoritative move validation (anti-cheat), AI runner
- Match persistence + replay-ready move log, ELO + XP + history, leaderboards
- Chat, reactions, profiles

## Tips
- **Turn-based perfect-information** games are the simplest — model `State` as the board + whose-turn + winner (see `tic-tac-toe.ts`).
- **Dice / randomness:** thread a seed through `State` and derive rolls deterministically so matches stay replayable.
- **Simultaneous** games (quizzes): return `null` from `currentTurn` and score per round inside `applyMove`.
- **Hidden information** (Mafia, cards): implement `viewFor(state, viewerPlayerId)` to strip secrets; the socket layer sends per-viewer snapshots.
- **Multi-seat** (3–4 players): `createInitialState` receives all seated `PlayerSlot`s — assign roles by `seat`.
- Test the engine in isolation — it's pure, so a plain script that plays a full game and asserts `getResult` is enough.
