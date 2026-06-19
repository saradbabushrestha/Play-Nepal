import { Router } from 'express';
import { asyncHandler, notFound } from '../../utils/http.js';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../../prisma.js';

export const userRouter: Router = Router();

// Recent match history for the signed-in user. Declared before "/:username"
// so the literal path isn't swallowed by the param route.
userRouter.get(
  '/me/history',
  requireAuth,
  asyncHandler(async (req, res) => {
    const history = await prisma.gameHistory.findMany({
      where: { userId: req.auth!.sub },
      include: { game: { select: { name: true, id: true } } },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    res.json({ ok: true, data: { history } });
  }),
);

// Public profile by username.
userRouter.get(
  '/:username',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username.toLowerCase() },
      select: {
        id: true, username: true, displayName: true, avatarUrl: true, level: true, xp: true,
        country: true, city: true, isOnline: true, createdAt: true,
        profile: true,
        ratings: { include: { game: { select: { name: true } } }, orderBy: { rating: 'desc' } },
        achievements: { include: { achievement: true }, orderBy: { unlockedAt: 'desc' }, take: 12 },
      },
    });
    if (!user) throw notFound('No such user.');
    res.json({ ok: true, data: { user } });
  }),
);
