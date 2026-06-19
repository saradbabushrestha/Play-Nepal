# Architecture

Play Nepal is a TypeScript monorepo with three workspaces and one guiding principle: **the game engine is pure, deterministic, and shared**, so the server is authoritative, the client can predict, and every match is replayable.

---

## 1. System overview

```
                    ┌─────────────────────────────────────────────┐
                    │                   Browser                    │
                    │  React 19 · Vite · Tailwind · Framer Motion  │
                    │  Zustand stores · Axios (REST) · socket.io   │
                    └───────────────┬───────────────┬─────────────┘
                          REST/JSON │               │ WebSocket (socket.io)
                       (auth, lobby,│               │ (rooms, chat, gameplay)
                        leaderboard)│               │
                    ┌───────────────▼───────────────▼─────────────┐
                    │              Node.js server                  │
                    │  Express (REST) ──┐      ┌── Socket.io       │
                    │                   │      │                   │
                    │             ┌─────▼──────▼─────┐             │
                    │             │  Services layer  │             │
                    │             │ auth·room·rating │             │
                    │             └─────┬──────┬─────┘             │
                    │     ┌─────────────▼──┐ ┌─▼──────────────┐    │
                    │     │  MatchRuntime  │ │ Prisma Client  │    │
                    │     │ (authoritative │ │                │    │
                    │     │  game loop+AI) │ │                │    │
                    │     └───────┬────────┘ └───────┬────────┘    │
                    └─────────────┼──────────────────┼────────────┘
                                  │ uses             │
                    ┌─────────────▼──────┐   ┌────────▼─────────┐
                    │  @play-nepal/shared │   │   PostgreSQL     │
                    │  GameEngine + games │   │  (Prisma schema) │
                    └─────────────────────┘   └──────────────────┘
                              ▲                  ┌──────────────┐
                              └── same code ─────│    Redis     │  (scale-out:
                                  on client      │ adapter/cache│   socket fan-out,
                                                 └──────────────┘   rate-limit, presence)
```

**Why a shared engine?** The exact same `applyMove` runs on the client (optimistic UI) and the server (authority). The server never trusts the client: it re-validates every move through the engine. Determinism + a persisted move log = free replays and crash recovery.

---

## 2. Workspaces

| Workspace | Package | Responsibility |
| --- | --- | --- |
| `packages/shared` | `@play-nepal/shared` | Domain types, the Socket.io event contract, and the **game-engine framework** + concrete engines. Imported by both server and web. |
| `apps/server` | `@play-nepal/server` | Express REST API, Socket.io realtime layer, Prisma data access, authoritative `MatchRuntime`. |
| `apps/web` | `@play-nepal/web` | React SPA: lobby, rooms, gameplay UIs, leaderboards, profiles. |

---

## 3. The game-engine framework

Every game implements one interface ([`packages/shared/src/games/engine.ts`](../packages/shared/src/games/engine.ts)):

```ts
interface GameEngine<S, M> {
  meta: GameMeta;
  createInitialState(players, options?): S;
  applyMove(state, move, playerId): { ok: true; state: S } | { ok: false; error };
  legalMoves(state, playerId): M[];
  currentTurn(state): string | null;
  getResult(state): GameResult | null;
  aiMove?(state, playerId, difficulty): M | null;   // optional AI
  viewFor?(state, viewerPlayerId): S;                // optional fog-of-war
}
```

Rules:
- **Pure** — no IO, no `Date.now()`, no `Math.random()` unless seeded through state. This is what makes matches replayable and server/client identical.
- **Immutable** — `applyMove` clones (`structuredClone`) and never mutates its input.
- **Self-validating** — illegal moves return `{ ok: false }`; the server surfaces the error to the offending client only.

**13 concrete engines shipped:** `baghchal` (full traditional rules + alpha-beta AI for tigers *and* goats), `tic-tac-toe` (perfect-play minimax), `connect-4` (alpha-beta + positional heuristic), `checkers` (mandatory capture, multi-jumps, kings, alpha-beta), `reversi` (corner-weighted minimax), `gomoku` (threat-pattern heuristic on 15×15), `dots-and-boxes` (chain-aware greedy AI), `ludo` & `snakes-ladders` (seeded-dice, 2–4 players), `2048` (single-player), `memory-match` (seeded shuffle + `viewFor` fog-of-war + memory AI), `nepali-quiz` & `math-challenge` (simultaneous-answer rounds with `viewFor` answer-hiding). They are registered in [`registry.ts`](../packages/shared/src/games/registry.ts); the runtime and AI runner pick them up automatically. Dice/shuffle games stay deterministic via a seeded RNG ([`rng.ts`](../packages/shared/src/games/rng.ts)) threaded through state.

To add a game, see [ADDING_A_GAME.md](ADDING_A_GAME.md).

---

## 4. Realtime: the MatchRuntime

[`apps/server/src/socket/match-runtime.ts`](../apps/server/src/socket/match-runtime.ts) owns every in-flight match in memory and is the single writer of authoritative state:

- **Start** — builds seats from room members, fills empty seats with AI when the game supports it, creates the `Match` row, broadcasts `game:started`.
- **Move** — verifies it's the caller's turn → runs `engine.applyMove` → bumps a monotonic `version` → persists state + move (async) → broadcasts `game:update`, or settles the match if terminal.
- **AI** — after each move, if the next seat is AI it schedules `engine.aiMove` (supports AI-vs-AI).
- **Settle** — updates ELO + XP + `GameHistory`, flips the room back to `LOBBY`, emits `game:over`, and frees memory after a grace period.

Clients reconcile using `version`; a reconnecting client re-runs `room:join` and receives the current `MatchSnapshot`, so refreshes and dropped connections recover cleanly.

---

## 5. REST API

Base path `/api`. Envelope: `{ ok: true, data } | { ok: false, code, message }`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | — | Create account, returns access token + sets refresh cookie |
| `POST` | `/auth/login` | — | Email/username + password login |
| `POST` | `/auth/google` | — | Verify a Google ID token, find-or-create user |
| `POST` | `/auth/refresh` | cookie | Rotate refresh token → new access token |
| `POST` | `/auth/logout` | cookie | Revoke refresh token |
| `GET` | `/auth/me` | access | Current user |
| `GET` | `/games` | — | Full 43-game catalogue + categories |
| `GET` | `/games/popular` | — | Most-played games |
| `GET` | `/rooms` | — | Browse public rooms |
| `POST` | `/rooms` | access | Create a room (returns join code) |
| `GET` | `/rooms/:code` | — | Resolve a join code to a room summary |
| `GET` | `/leaderboard?gameId&country&limit` | — | Global or per-game ELO leaderboard |
| `GET` | `/users/:username` | — | Public profile (ratings, achievements) |
| `GET` | `/users/me/history` | access | Recent match history |
| `GET` | `/health` | — | Liveness probe |

Access tokens are short-lived JWTs (Authorization header / used for socket auth). Refresh tokens are opaque, **stored only as SHA-256 hashes**, rotated on use, and delivered as `httpOnly` cookies scoped to `/api/auth`.

---

## 6. Socket.io contract

Fully typed in [`packages/shared/src/socket-events.ts`](../packages/shared/src/socket-events.ts). Auth happens in the handshake (`auth.token`). Rooms map to socket rooms `room:<id>`; users have a personal channel `user:<id>`.

**Client → server** (all with ack callbacks): `room:join`, `room:leave`, `room:ready`, `room:start`, `room:kick`, `room:chat`, `room:react`, `game:move`, `game:resign`, `game:rematch`.

**Server → client**: `room:state`, `room:member-joined/left`, `room:chat`, `room:react`, `room:kicked`, `game:started`, `game:update`, `game:over`, `error`.

Move flow:

```
client            server (socket)         MatchRuntime          engine
  │  game:move ───────▶│                      │                   │
  │                    │  applyMove(...) ─────▶│  currentTurn? ───▶│
  │                    │                      │  applyMove ───────▶│ validate+next
  │                    │                      │◀── ok/err ─────────│
  │                    │   persist + version  │                   │
  │◀── ack(snapshot) ──│◀─────────────────────│                   │
  │◀── game:update (broadcast to room) ───────│                   │
```

---

## 7. Data model

The complete schema is in [`apps/server/prisma/schema.prisma`](../apps/server/prisma/schema.prisma). Highlights:

- **Identity:** `User`, `Profile`, `RefreshToken` (hashed, revocable sessions).
- **Catalogue:** `Game` (seeded from the shared catalogue, all 6 categories).
- **Rooms:** `Room`, `RoomMember`, `RoomBan`, `ChatMessage`.
- **Gameplay:** `Match` (authoritative `state` + `moves` JSON for replay), `MatchPlayer`, `GameHistory`.
- **Ranking:** `Rating` (per-user, per-game ELO), aggregated for the global board.
- **Progression:** `Achievement`, `UserAchievement` (machine-checkable `rule` JSON).
- **Social:** `FriendRequest`, `Friendship` (single row per pair).
- **Competition:** `Tournament`, `TournamentPlayer`, `TournamentMatch` (single/double elimination brackets).
- **Platform:** `Notification`, `Report` (moderation / admin panel).

Indexes are placed on the hot paths (online users, per-game ratings, room status, history by user+time).

---

## 8. Frontend architecture

- **Routing:** `react-router-dom`; `ProtectedRoute` gates the lobby/room.
- **State:** lightweight **Zustand** stores — `auth` (user + token bootstrap via silent refresh) and `theme` (dark/light). Server state is fetched per-page via Axios; realtime state lives in the `Room` component subscribed to the socket.
- **API client:** Axios instance with an in-memory access token and a **transparent 401→refresh→retry** interceptor.
- **UI kit:** hand-rolled ShadCN-style primitives (`Button`, `Card`, `Input`, `Badge`, `Avatar`) built on `class-variance-authority` + `tailwind-merge`, themed with CSS variables (Nepali-crimson primary). Dark mode by default.
- **Game UIs:** each board component (`games/TicTacToe.tsx`, `Connect4.tsx`, `Baghchal.tsx`) is a pure renderer of the engine's `MatchSnapshot` + an `onMove` callback. `GameView` switches on `gameId`.

---

## 9. Security

| Concern | Mitigation |
| --- | --- |
| Passwords | bcrypt (cost 12), never returned to clients |
| Sessions | short access JWT + rotating refresh token stored as a hash, httpOnly cookie |
| Move cheating | server re-validates **every** move through the authoritative engine |
| Rate limiting | global + strict auth limiter (`express-rate-limit`) |
| Headers | `helmet`; SPA CSP + security headers at nginx |
| CORS | explicit origin allow-list with credentials |
| Input | `zod` validation on every REST body and socket payload boundary |
| SQL injection | Prisma parameterised queries only |
| XSS | React escaping + sanitised chat length caps; no `dangerouslySetInnerHTML` |
| Authorization | host-only room actions enforced server-side; role gate for admin |

See [SCALING.md](SCALING.md) for anti-spam, presence, and abuse handling at scale.

---

## 10. UI wireframes

```
LOBBY                                         ROOM (in game)
┌───────────────────────────────────────┐    ┌───────────────────────────────────────┐
│ 🇳🇵 Play Nepal      Play  Leaderboard ●│    │ 🐯 Tigers vs Goats     NP7K2Q ⧉  Leave │
├───────────────────────────────────────┤    ├──────────────────────────┬────────────┤
│ Game Lobby            [ CODE ] [Join]  │    │  🟢 Your turn            │ Players (2)│
│                                        │    │                          │ 👤 Sagar 👑│
│ Open public rooms                      │    │      ◯───◯───◯───◯───◯   │ 🤖 AI      │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐    │    │      │ 🐯  🐐    🐯 │    │            │
│ │🐯 Bagh..│ │⭕ TTT   │ │🔴 C4    │    │    │      ◯───◯───◯───◯───◯   │ Chat       │
│ │2/2  Live│ │1/2  Live│ │0/2  Live│    │    │      │   🐐  🐐     │    │ Sagar: gg  │
│ └─────────┘ └─────────┘ └─────────┘    │    │      ◯───◯───◯───◯───◯   │ ...        │
│                                        │    │                          │ [msg ][>]  │
│ [All][Nepali][Board][Office][Party]... │    │ 👍 🔥 😂 🎉  Captured 2/5 │            │
│ ┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐   │    └──────────────────────────┴────────────┘
│ │game││game││game││game││game││game│   │
└───────────────────────────────────────┘
```

The Landing, Leaderboard, and Profile screens follow the same card-driven, dark-first system (see `apps/web/src/pages`).
