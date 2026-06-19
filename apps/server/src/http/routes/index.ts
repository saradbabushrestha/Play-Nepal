import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { gameRouter } from './game.routes.js';
import { leaderboardRouter } from './leaderboard.routes.js';
import { roomRouter } from './room.routes.js';
import { userRouter } from './user.routes.js';
import { friendRouter } from './friend.routes.js';

export const apiRouter: Router = Router();

apiRouter.get('/health', (_req, res) => res.json({ ok: true, data: { status: 'up' } }));
apiRouter.use('/auth', authRouter);
apiRouter.use('/games', gameRouter);
apiRouter.use('/rooms', roomRouter);
apiRouter.use('/leaderboard', leaderboardRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/friends', friendRouter);
