import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { HttpError } from '../../utils/http.js';
import { logger } from '../../logger.js';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ ok: false, code: 'NOT_FOUND', message: 'Route not found.' });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ ok: false, code: err.code, message: err.message });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ ok: false, code: 'CONFLICT', message: 'That value is already taken.' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ ok: false, code: 'NOT_FOUND', message: 'Resource not found.' });
    }
  }
  logger.error({ err }, 'Unhandled error');
  return res.status(500).json({ ok: false, code: 'INTERNAL', message: 'Something went wrong.' });
}
