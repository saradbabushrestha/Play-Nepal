import { Router, type Response } from 'express';
import { z } from 'zod';
import { isProd } from '../../env.js';
import { asyncHandler, parseOrThrow, unauthorized } from '../../utils/http.js';
import {
  getSafeUser,
  loginUser,
  loginWithGoogle,
  registerUser,
  type SafeUser,
} from '../../services/auth.service.js';
import {
  issueRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken,
} from '../../services/token.service.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';

const REFRESH_COOKIE = 'refresh_token';

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20),
  password: z.string().min(8).max(100),
  displayName: z.string().max(40).optional(),
});

const loginSchema = z.object({
  emailOrUsername: z.string().min(1),
  password: z.string().min(1),
});

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    path: '/api/auth',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

async function issueSession(res: Response, user: SafeUser, meta: { userAgent?: string; ip?: string }) {
  const accessToken = signAccessToken({ sub: user.id, username: user.username, role: user.role });
  const refreshToken = await issueRefreshToken(user.id, meta);
  setRefreshCookie(res, refreshToken);
  return { user, accessToken };
}

export const authRouter: Router = Router();

authRouter.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = parseOrThrow(registerSchema, req.body);
    const user = await registerUser(input);
    const session = await issueSession(res, user, { userAgent: req.headers['user-agent'], ip: req.ip });
    res.status(201).json({ ok: true, data: session });
  }),
);

authRouter.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = parseOrThrow(loginSchema, req.body);
    const user = await loginUser(input);
    const session = await issueSession(res, user, { userAgent: req.headers['user-agent'], ip: req.ip });
    res.json({ ok: true, data: session });
  }),
);

authRouter.post(
  '/google',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { idToken } = parseOrThrow(z.object({ idToken: z.string().min(10) }), req.body);
    const user = await loginWithGoogle(idToken);
    const session = await issueSession(res, user, { userAgent: req.headers['user-agent'], ip: req.ip });
    res.json({ ok: true, data: session });
  }),
);

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const token = (req.cookies as Record<string, string>)?.[REFRESH_COOKIE];
    if (!token) throw unauthorized('No refresh token.');
    const rotated = await rotateRefreshToken(token, { userAgent: req.headers['user-agent'], ip: req.ip });
    if (!rotated) throw unauthorized('Refresh token invalid or expired.');
    const user = await getSafeUser(rotated.userId);
    if (!user) throw unauthorized();
    setRefreshCookie(res, rotated.refreshToken);
    const accessToken = signAccessToken({ sub: user.id, username: user.username, role: user.role });
    res.json({ ok: true, data: { user, accessToken } });
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const token = (req.cookies as Record<string, string>)?.[REFRESH_COOKIE];
    if (token) await revokeRefreshToken(token);
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
    res.json({ ok: true, data: { ok: true } });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await getSafeUser(req.auth!.sub);
    if (!user) throw unauthorized();
    res.json({ ok: true, data: { user } });
  }),
);
