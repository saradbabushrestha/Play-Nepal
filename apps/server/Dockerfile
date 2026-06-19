# ── Build stage ──
FROM node:20-slim AS build
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install all workspace deps (root + packages) with the lockfile.
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/
RUN npm install

# Copy sources and build shared → server.
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/server apps/server
RUN npm run build --workspace=@play-nepal/shared \
 && npm run build --workspace=@play-nepal/server

# Prune to production deps for the runtime image.
RUN npm prune --omit=dev

# ── Runtime stage ──
FROM node:20-slim AS runtime
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/server/package.json ./apps/server/package.json
COPY --from=build /app/apps/server/prisma ./apps/server/prisma

WORKDIR /app/apps/server
EXPOSE 4000
# Apply migrations then boot.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
