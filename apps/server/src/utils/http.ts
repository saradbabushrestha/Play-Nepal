import type { NextFunction, Request, Response } from 'express';
import { z, ZodError, type ZodTypeAny } from 'zod';

/** Wrap async route handlers so thrown errors reach the error middleware. */
export const asyncHandler =
  <T extends Request>(fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req as T, res, next)).catch(next);

/** A typed application error carrying an HTTP status. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'ERROR',
  ) {
    super(message);
  }
}

export const badRequest = (msg: string) => new HttpError(400, msg, 'BAD_REQUEST');
export const unauthorized = (msg = 'Unauthorized') => new HttpError(401, msg, 'UNAUTHORIZED');
export const forbidden = (msg = 'Forbidden') => new HttpError(403, msg, 'FORBIDDEN');
export const notFound = (msg = 'Not found') => new HttpError(404, msg, 'NOT_FOUND');
export const conflict = (msg: string) => new HttpError(409, msg, 'CONFLICT');

/** Validate `data` against a zod schema or throw a 400 with field details. */
export function parseOrThrow<S extends ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  try {
    return schema.parse(data) as z.infer<S>;
  } catch (err) {
    if (err instanceof ZodError) {
      const first = err.errors[0];
      throw badRequest(first ? `${first.path.join('.')}: ${first.message}` : 'Invalid request');
    }
    throw err;
  }
}
