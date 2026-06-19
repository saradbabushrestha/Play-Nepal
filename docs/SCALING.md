# Scaling strategy — to 100k users & thousands of concurrent matches

The MVP runs as a single Node process with in-memory match state. This document is the path from there to a horizontally-scaled platform. Each step is independent and additive.

---

## 1. Stateless REST, horizontal scale

The Express API is already stateless (JWT auth, no server session affinity). Run **N replicas behind a load balancer**. The only shared state is Postgres + Redis. Auto-scale on CPU / request latency.

## 2. Socket.io fan-out across nodes

Today a match lives in one process's memory, so all its players must hit the same node.

- Add the **`@socket.io/redis-adapter`** so `io.to(room).emit(...)` reaches sockets on every node.
- Use **sticky sessions** (LB hash on client IP / cookie) so a socket's polling fallback stays pinned; websocket upgrades then persist.
- Move authoritative match state out of process memory into **Redis** (one hash per match: `state`, `version`, `players`). The `MatchRuntime` becomes a thin layer over Redis with an optimistic-locking `WATCH/MULTI` on `version`, so any node can apply a move to any match. Persist to Postgres asynchronously (write-behind).

```
   LB (sticky)
   ┌──┴──┬──────┬──────┐
 node1  node2  node3  node4   ← socket.io + redis-adapter
   └──┬──┴──┬───┴──┬───┘
      └─────┴──────┘
        Redis (pub/sub + match state + presence)
            │ write-behind
        Postgres (durable history, replicas for reads)
```

## 3. Database

- **Connection pooling** via PgBouncer (Prisma opens many connections under load).
- **Read replicas** for leaderboards, profiles, history; writes to primary.
- Hot leaderboards: maintain **Redis sorted sets** (`ZADD` per rating change) for O(log n) top-N and rank lookups; reconcile from Postgres periodically.
- Partition / archive `GameHistory` and finished `Match` rows (time-based) to keep the working set small.
- The schema is already indexed on hot paths; add composite indexes as query patterns emerge from real traffic.

## 4. Match runtime & AI

- AI search (Connect 4 / Baghchal alpha-beta) is CPU-bound. Offload AI turns to a **worker pool** (`worker_threads`) or a dedicated "AI service" so game I/O threads stay responsive.
- Cap per-match AI think time; the engines already take a difficulty/depth parameter.
- Idle/abandoned matches: a reaper settles or abandons matches with no activity to free memory/Redis.

## 5. Caching

- Catalogue (`/games`) is static → CDN + long cache headers (already served from the SPA bundle/static layer).
- Profile and leaderboard responses → short-TTL Redis cache with cache-busting on write.

## 6. Realtime cost control

- Prefer **websocket transport** (configured) to avoid long-polling overhead.
- Batch/throttle high-frequency events (drawing strokes, reactions) per room.
- Large office rooms (50+): broadcast diffs, not full snapshots; compress with a binary codec if needed.

## 7. Anti-abuse & rate limiting at scale

- Move the rate limiter store to **Redis** (`rate-limit-redis`) so limits are global across nodes.
- Per-socket action throttles (chat, moves, reactions) to blunt spam.
- Bot/cheat signals: impossible move rates, win-rate anomalies → shadow-flag for review via the `Report`/moderation pipeline.

## 8. Observability

- Structured logs (pino, already wired) shipped to a log store.
- Metrics (Prometheus): active sockets, matches in flight, move latency, AI compute time, DB pool saturation.
- Tracing (OpenTelemetry) across REST → service → Prisma.
- Alerting on socket disconnect storms, error-rate, and DB latency.

## 9. Capacity targets & testing

- Target: **100k registered / ~10k concurrent / thousands of live matches**.
- Load test with **k6 / Artillery** (socket scenarios): ramp concurrent rooms, measure p95 move round-trip and memory per match.
- Rule of thumb: a single 2-vCPU node comfortably holds several thousand idle sockets; matches are cheap (small JSON state). Scale nodes on concurrent-socket count; scale Redis/Postgres on write throughput.

## 10. Deployment topology (target)

- Multiple API/socket nodes (k8s deployment, HPA) behind an ingress with sticky sessions.
- Managed Postgres (primary + replicas) and managed Redis.
- CDN in front of the static SPA.
- Blue/green or rolling deploys; `prisma migrate deploy` gated in the pipeline.

See [DEPLOYMENT.md](DEPLOYMENT.md) for the concrete deploy mechanics.
