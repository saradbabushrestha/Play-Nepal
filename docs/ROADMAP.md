# Roadmap, MVP plan & delivery phases

Play Nepal's brief lists **43 games**, tournaments, achievements, an admin panel, and 100k-user scale. This repo delivers the **foundation + 13 live games end-to-end**. The rest is well-scoped work on top of the same engine. This document is the plan to get there.

---

## MVP (shipped in this repo) ✅

The MVP proves the whole loop works for real:

- Accounts (email + Google), profiles, XP/levels.
- Create/join rooms by code; public/private/password; spectators; chat; reactions; host controls.
- Authoritative realtime matches with reconnection + replay-ready move logs.
- **13 live games** across all-but-two categories (Baghchal, Tic-Tac-Toe, Connect 4, Checkers, Reversi, Gomoku, Dots & Boxes, Ludo, Snakes & Ladders, 2048, Memory Match, Nepali Quiz, Math Challenge) — most with AI opponents, plus seeded dice & simultaneous-answer engines.
- Per-game + global ELO leaderboards.
- Full database schema for everything in the brief.
- Docker, nginx, CI.

**Definition of done for MVP:** a user can sign up, start a Baghchal game vs AI, beat it, gain ELO + XP, and appear on the leaderboard — all verified locally. ✅

---

## Phase 1 — Catalogue breadth (board + casual)

Fastest wins, because they reuse the existing turn-based engine pattern.

| Game | Effort | Notes |
| --- | --- | --- |
| Chess | M | Engine + legality (consider `chess.js` wrapped behind `GameEngine`); AI via depth-limited search. |
| Checkers | S | Same jump mechanics family as Baghchal captures. |
| Snakes & Ladders, Ludo | S–M | Add dice (seeded RNG threaded through move) + multi-seat turn order (already supported). |
| Carrom | L | Needs a physics step; model as deterministic sim with seeded impulse. |
| Casual single-player (2048, Sudoku, Minesweeper, Number puzzle, Memory match, Word search) | S each | Mostly client-side; server stores scores → async leaderboards. |

**Deliverable:** ~15 live games. Each = one engine file + one board component + a registry line.

---

## Phase 2 — Quiz & content engine (educational + Nepali quiz)

A single **quiz engine** powers many "games": Nepali Quiz (GK/History/Loksewa/Geography), Coding Quiz, Math Challenge, Vocabulary, Geography.

- `QuestionBank` table + admin authoring.
- Timed rounds, simultaneous answers (engine `currentTurn = null`, scoring per round).
- Reusable lobby UI with a question/answer board component.

**Deliverable:** quiz framework + 5–7 quiz-style games.

---

## Phase 3 — Party & hidden-information games

These exercise the engine's `viewFor` fog-of-war hook (already in the interface).

- Mafia / Werewolf — roles, night/day phases, voting; per-player private views via `viewFor`.
- Drawing & Guessing, Charades, Heads Up — add a canvas/stroke channel over sockets.
- Meme Battle, Guess the Movie/Song — content + voting rounds.

**Deliverable:** moderator tools, voice-channel readiness (WebRTC signalling over the existing socket), live reactions (already shipped).

---

## Phase 4 — Office team-building suite

Host-driven, presentation-mode games for large groups (Spin the Wheel, Bingo, Would You Rather, Most Likely To, Icebreakers, Team Quiz, Rapid Fire, Guess the Employee).

- "Presentation mode" layout + corporate branding (room `settings` JSON already supports per-room config).
- Large-room socket fan-out (see SCALING.md).

---

## Phase 5 — Tournaments

Schema is already in place (`Tournament`, `TournamentPlayer`, `TournamentMatch`).

- Bracket generator (single + double elimination).
- Daily/weekly/monthly cadence via a scheduler (BullMQ/cron).
- Auto-advance winners, prize tracking, tournament history, live bracket UI.

---

## Phase 6 — Achievements, social & notifications

- Achievement evaluator: after each match, check `Achievement.rule` JSON against the user's stats → unlock + notify.
- Friends list, requests, online presence (Redis presence set), invites to rooms.
- In-app + push notifications.

---

## Phase 7 — Admin panel & analytics

- Admin SPA (role-gated) over the existing REST layer: users, games, rooms, reports, tournaments, content.
- Analytics: DAU/MAU, retention cohorts, popular games (from `Game.playCount` + `GameHistory`), funnels.
- Moderation queue backed by the `Report` model.

---

## Phase 8 — Hardening for scale

Everything in [SCALING.md](SCALING.md): Redis socket adapter, sticky sessions, match state in Redis, read replicas, observability, load testing to 100k users / thousands of concurrent matches.

---

## Suggested team & timeline (indicative)

| Phase | Focus | Rough size |
| --- | --- | --- |
| MVP | ✅ done | — |
| 1–2 | 2 game devs + 1 FE | 6–8 weeks |
| 3–4 | + 1 realtime dev | 6–8 weeks |
| 5–6 | + 1 BE dev | 4–6 weeks |
| 7 | 1 FE + 1 BE | 3–4 weeks |
| 8 | 1 platform/SRE | continuous |

The architecture is deliberately **additive**: new games never touch the auth, room, socket, or persistence layers — they only add an engine + a board.
