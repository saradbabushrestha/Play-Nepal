import { Router } from 'express';
import { CATEGORY_LABELS, GAME_CATALOG } from '@play-nepal/shared';
import { asyncHandler } from '../../utils/http.js';
import { prisma } from '../../prisma.js';

export const gameRouter: Router = Router();

// Static catalogue (all 43 games) — instantly available, no DB hit.
gameRouter.get('/', (_req, res) => {
  res.json({ ok: true, data: { games: GAME_CATALOG, categories: CATEGORY_LABELS } });
});

gameRouter.get(
  '/popular',
  asyncHandler(async (_req, res) => {
    const games = await prisma.game.findMany({
      orderBy: { playCount: 'desc' },
      take: 8,
      select: { id: true, name: true, category: true, playCount: true, status: true },
    });
    res.json({ ok: true, data: { games } });
  }),
);

gameRouter.get('/:id', (req, res) => {
  const game = GAME_CATALOG.find((g) => g.id === req.params.id);
  if (!game) return res.status(404).json({ ok: false, code: 'NOT_FOUND', message: 'Unknown game.' });
  res.json({ ok: true, data: { game } });
});
