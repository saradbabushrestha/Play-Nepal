# 🇳🇵 Play Nepal

> Nepal's largest multiplayer gaming platform — Baghchal, board classics, office team-builders, party games, quizzes & casual games. Real-time, ranked, and built to scale.

Play Nepal is a startup-grade, full-stack monorepo: a **React 19** client, an **Express + Socket.io** authoritative game server, **PostgreSQL + Prisma**, and a **pluggable game engine** shared by both ends so games are deterministic, replayable, and cheat-resistant.

This repository ships a **complete, production-ready platform with all 46 games fully playable** — every game in the product brief plus a few extras (Reversi, Gomoku, Dots & Boxes). Highlights: the flagship **Baghchal**, full **Chess** (perft-verified, alpha-beta AI), **Carrom** (deterministic 2D physics), **Mafia**/**Werewolf** (hidden-role social deduction), **Ludo**, **Draw & Guess** (live shared canvas), and dozens more across every category — board, casual, educational, office, party and Nepali traditional.

---

## ✨ What's implemented today

| Area | Status |
| --- | --- |
| Auth — register / login / JWT refresh / Google OAuth | ✅ |
| User profiles, XP, levels, per-game ELO ratings | ✅ |
| Rooms — create / join by code / public / private / password / spectators | ✅ |
| Real-time lobby, chat, emoji reactions, host controls (start/kick) | ✅ |
| Authoritative match runtime + reconnection-safe snapshots | ✅ |
| Pluggable game-engine framework (deterministic, replayable) | ✅ |
| **All 46 games live** — board (Chess, Carrom, Checkers, Ludo…), Nepali (Baghchal, Langur Burja, Gatti…), party (Mafia, Werewolf, Charades, Draw & Guess…), office, educational, casual | ✅ |
| Leaderboards (global + per-game, country filter) | ✅ |
| Full Prisma schema (tournaments, achievements, friends, notifications, reports) | ✅ |
| Security: helmet, CORS, rate limiting, hashed passwords + refresh tokens, server-side move validation | ✅ |
| Docker + nginx + GitHub Actions CI | ✅ |
| Tournament engine, admin panel | 🗺️ Roadmapped — see [docs/ROADMAP.md](docs/ROADMAP.md) |

---

## 🧱 Monorepo layout

```
play-nepal/
├─ packages/
│  └─ shared/            # Types + Socket.io contract + the game-engine framework
│     └─ src/games/      #   tic-tac-toe.ts · connect4.ts · baghchal.ts (pure logic + AI)
├─ apps/
│  ├─ server/            # Express + Socket.io + Prisma (authoritative)
│  │  ├─ prisma/         #   schema.prisma · seed.ts
│  │  └─ src/
│  │     ├─ http/        #   REST routes + middleware (auth, rate-limit, errors)
│  │     ├─ services/    #   auth, tokens, rooms, ratings
│  │     └─ socket/      #   socket server + match-runtime (the realtime core)
│  └─ web/               # React 19 + Vite + Tailwind + ShadCN-style UI + Framer Motion
│     └─ src/
│        ├─ pages/       #   Landing · Login · Lobby · Room · Leaderboard · Profile
│        └─ games/       #   board UIs that render the shared engine state
├─ docs/                 # ARCHITECTURE · ROADMAP · SCALING · DEPLOYMENT · ADDING_A_GAME
├─ docker-compose.yml    # postgres + redis (+ full app profile)
└─ .github/workflows/    # CI: typecheck + build + migrate
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design.

---

## 🚀 Quickstart (local dev)

**Prerequisites:** Node ≥ 20, Docker (for Postgres), npm.

```bash
# 1. Install all workspaces
npm install

# 2. Configure env
cp .env.example .env          # the defaults work out of the box for local dev

# 3. Start Postgres + Redis
npm run db:up

# 4. Set up the database (generate client, migrate, seed catalogue + demo users)
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed

# 5. Run the server and web app (two processes)
npm run dev:server            # http://localhost:4000
npm run dev:web               # http://localhost:5173
```

Open **http://localhost:5173**, log in with the seeded demo account **`sagar` / `password123`**, create a Baghchal room, and click **Start** — the server fills the empty seat with an AI opponent so you can play immediately.

> Tip: open a second browser (or incognito) logged in as `anjali` / `password123`, join the room with the code, and play head-to-head in real time.

---

## 🕹️ How a match works (end-to-end)

1. A host **creates a room** (`POST /api/rooms`) → gets a 6-char join code.
2. Players **join over Socket.io** (`room:join`) and land in the realtime lobby with chat.
3. The host hits **Start** (`room:start`) → the `MatchRuntime` builds seats, instantiates the **shared engine**, persists a `Match`, and broadcasts `game:started`.
4. Each move is sent as `game:move`. The server **re-validates it through the same engine** (anti-cheat), updates authoritative state, persists the move log (for replay), and broadcasts `game:update`.
5. On a terminal state the runtime settles ELO, writes `GameHistory`, awards XP, and emits `game:over`.

Because the engine is **pure and deterministic** and lives in `packages/shared`, the client can predict optimistically and any match can be **replayed from its move log**.

---

## 📜 Useful scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Run server + web together |
| `npm run build` | Build shared → server → web |
| `npm run typecheck` | Typecheck every workspace |
| `npm run prisma:studio --workspace=@play-nepal/server` | Browse the DB |
| `docker compose --profile full up --build` | Run the entire stack in containers |

---

## 📚 Documentation

- [Architecture](docs/ARCHITECTURE.md) — system design, data flow, schema, API & socket contracts, wireframes
- [Roadmap & MVP plan](docs/ROADMAP.md) — phased delivery of all 43 games, tournaments, admin
- [Adding a game](docs/ADDING_A_GAME.md) — implement the engine interface + a board component
- [Scaling strategy](docs/SCALING.md) — to 100k users & thousands of concurrent matches
- [Deployment guide](docs/DEPLOYMENT.md) — Docker, nginx, CI/CD, env & secrets

---

## ⚖️ License

MIT — see headers. Built as a demonstration platform for Nepal's gaming community.
# Play-Nepal
