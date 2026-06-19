# Deployment guide

Three ways to run Play Nepal: local dev, full Docker stack, and production.

---

## 1. Local development

```bash
npm install
cp .env.example .env
npm run db:up                 # postgres (5433) + redis (6379) via docker compose
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run dev:server            # :4000
npm run dev:web               # :5173 (proxies /api + /socket.io to :4000)
```

---

## 2. Full containerised stack (prod-like, one host)

Builds the server and web images and runs everything together:

```bash
# Optional: set strong secrets first
export JWT_ACCESS_SECRET=$(openssl rand -hex 32)
export JWT_REFRESH_SECRET=$(openssl rand -hex 32)

docker compose --profile full up --build
```

- Web (nginx) → http://localhost:8080
- API + sockets → proxied by nginx at `/api` and `/socket.io` to the `server` container
- The server container runs `prisma migrate deploy` on boot, then starts.

To seed the catalogue in the running stack:

```bash
docker compose exec server npx prisma db seed
```

---

## 3. Production

### Build artifacts
- **Server:** multi-stage Dockerfile → slim Node image running compiled `dist/index.js`. Migrations applied at startup (`prisma migrate deploy`).
- **Web:** multi-stage Dockerfile → static bundle served by nginx with SPA fallback, asset caching, and security headers. `VITE_*` values are baked at build time.

### Required environment (server)

| Var | Notes |
| --- | --- |
| `DATABASE_URL` | Managed Postgres connection string (use PgBouncer in front). |
| `REDIS_URL` | Required once you run >1 node (socket adapter, presence, rate limit). |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | 32+ random bytes each, from your secret manager. |
| `WEB_ORIGIN` | Comma-separated allowed origins for CORS + socket. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | For Google sign-in (optional). |

Web build args: `VITE_API_URL`, `VITE_SOCKET_URL` (empty string = same-origin behind nginx), `VITE_GOOGLE_CLIENT_ID`.

### Recommended topology
- Managed Postgres (primary + read replicas) and managed Redis.
- API/socket containers on a platform with **sticky sessions** (k8s ingress with session affinity, or an LB hashing on a cookie). See [SCALING.md](SCALING.md).
- Static SPA behind a CDN.
- TLS terminated at the edge; force HTTPS; secure cookies (the server already sets `secure`/`sameSite` in production).

### CI/CD

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs on every push/PR:
1. `npm ci`
2. `prisma generate`
3. build shared
4. **typecheck all workspaces**
5. `prisma migrate deploy` against an ephemeral Postgres
6. build server + web

Extend it with a deploy job (build & push images, `prisma migrate deploy` against prod, rolling update) gated on the `main` branch.

### Operational runbook
- **Migrations:** always `prisma migrate deploy` (never `migrate dev`) in prod; review the generated SQL in PRs.
- **Zero-downtime:** rolling deploy; migrations must be backward-compatible (expand-then-contract).
- **Backups:** automated Postgres snapshots + PITR; test restores.
- **Health:** `GET /api/health` for liveness; add a readiness probe that checks DB connectivity.
- **Secrets rotation:** rotating `JWT_*` invalidates access tokens at next expiry; refresh tokens are DB-backed and individually revocable.

### Scaling checklist before launch
- [ ] Redis socket adapter + sticky sessions enabled
- [ ] Match state moved to Redis (multi-node) — see SCALING.md §2
- [ ] Rate-limit store on Redis
- [ ] PgBouncer + read replicas
- [ ] Metrics + tracing + alerting wired
- [ ] k6/Artillery socket load test passing at target concurrency
