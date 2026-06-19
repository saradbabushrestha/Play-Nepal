import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../env.js';
import { prisma } from '../prisma.js';
import { makeRefreshToken, hashToken } from '../utils/crypto.js';

export interface AccessTokenPayload {
  sub: string; // userId
  username: string;
  role: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

/** Issue a refresh token, persisting only its hash. Returns the raw token. */
export async function issueRefreshToken(
  userId: string,
  meta: { userAgent?: string; ip?: string } = {},
): Promise<string> {
  const { token, tokenHash } = makeRefreshToken();
  const ttlDays = parseInt(env.JWT_REFRESH_TTL.replace(/\D/g, ''), 10) || 30;
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt, userAgent: meta.userAgent, ip: meta.ip },
  });
  return token;
}

/** Validate a refresh token, rotating it (revoke old, issue new). */
export async function rotateRefreshToken(rawToken: string, meta: { userAgent?: string; ip?: string } = {}) {
  const tokenHash = hashToken(rawToken);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
    return null;
  }
  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });
  const fresh = await issueRefreshToken(existing.userId, meta);
  return { userId: existing.userId, refreshToken: fresh };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
