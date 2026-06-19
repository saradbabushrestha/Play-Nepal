import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './env.js';
import { logger } from './logger.js';
import { apiRouter } from './http/routes/index.js';
import { errorHandler, notFoundHandler } from './http/middleware/error.js';
import { globalLimiter } from './http/middleware/rateLimit.js';

export function createApp(): Express {
  const app = express();

  // Trust the reverse proxy (nginx) so rate-limit + req.ip work behind it.
  app.set('trust proxy', 1);

  // Security headers (CSP handled at the nginx/web layer for the SPA).
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  app.use(
    cors({
      origin: env.WEB_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/health' } }));

  app.use('/api', globalLimiter, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
