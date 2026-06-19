import { Router } from 'express';
import { z } from 'zod';
import type { LeaderboardRow } from '@play-nepal/shared';
import { asyncHandler, parseOrThrow } from '../../utils/http.js';
import { prisma } from '../../prisma.js';
import { optionalAuth } from '../middleware/auth.js';
import { getFriendIds } from '../../services/friend.service.js';

export const leaderboardRouter: Router = Router();

const querySchema = z.object({
  gameId: z.string().optional(),
  country: z.string().optional(),
  friends: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// Per-game leaderboard ranked by ELO; or global (summed) when gameId omitted.
// `friends=1` (when signed in) restricts the board to you + your friends.
leaderboardRouter.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { gameId, country, friends, limit } = parseOrThrow(querySchema, req.query);

    let allowedIds: string[] | null = null;
    if (friends && req.auth) {
      allowedIds = [req.auth.sub, ...(await getFriendIds(req.auth.sub))];
    }
    const userFilter = allowedIds ? { userId: { in: allowedIds } } : {};

    if (gameId) {
      const ratings = await prisma.rating.findMany({
        where: { gameId, ...userFilter, ...(country ? { user: { country } } : {}) },
        orderBy: { rating: 'desc' },
        take: limit,
        include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      });
      const rows: LeaderboardRow[] = ratings.map((r, i) => ({
        rank: i + 1, userId: r.userId, username: r.user.username, displayName: r.user.displayName,
        avatarUrl: r.user.avatarUrl, rating: r.rating, wins: r.wins, losses: r.losses, draws: r.draws,
      }));
      return res.json({ ok: true, data: { rows, scope: gameId } });
    }

    // Global: aggregate ELO across games + XP as tiebreak.
    const grouped = await prisma.rating.groupBy({
      by: ['userId'],
      where: userFilter,
      _sum: { rating: true, wins: true, losses: true, draws: true },
      orderBy: { _sum: { rating: 'desc' } },
      take: limit,
    });
    const users = await prisma.user.findMany({
      where: { id: { in: grouped.map((g) => g.userId) }, ...(country ? { country } : {}) },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    const rows: LeaderboardRow[] = grouped
      .filter((g) => byId.has(g.userId))
      .map((g, i) => {
        const u = byId.get(g.userId)!;
        return {
          rank: i + 1, userId: g.userId, username: u.username, displayName: u.displayName,
          avatarUrl: u.avatarUrl, rating: g._sum.rating ?? 0, wins: g._sum.wins ?? 0,
          losses: g._sum.losses ?? 0, draws: g._sum.draws ?? 0,
        };
      });
    res.json({ ok: true, data: { rows, scope: 'global' } });
  }),
);
