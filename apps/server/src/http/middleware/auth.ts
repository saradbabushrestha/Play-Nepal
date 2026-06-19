import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken, type AccessTokenPayload } from '../../services/token.service.js';
import { forbidden, unauthorized } from '../../utils/http.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  const cookie = (req.cookies as Record<string, string> | undefined)?.access_token;
  return cookie ?? null;
}

/** Require a valid access token; attaches `req.auth`. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return next(unauthorized('Missing access token.'));
  try {
    req.auth = verifyAccessToken(token);
    next();
  } catch {
    next(unauthorized('Invalid or expired token.'));
  }
}

/** Attach `req.auth` if a valid token is present, but don't require it. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    try {
      req.auth = verifyAccessToken(token);
    } catch {
      /* ignore — treat as anonymous */
    }
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(unauthorized());
    if (!roles.includes(req.auth.role)) return next(forbidden('Insufficient permissions.'));
    next();
  };
}
