import { OAuth2Client } from 'google-auth-library';
import { env, googleEnabled } from '../env.js';
import { prisma } from '../prisma.js';
import { badRequest, conflict, unauthorized } from '../utils/http.js';
import { hashPassword, verifyPassword } from '../utils/crypto.js';
import type { User } from '@prisma/client';

const googleClient = googleEnabled ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

export type SafeUser = Pick<
  User,
  'id' | 'email' | 'username' | 'displayName' | 'avatarUrl' | 'role' | 'xp' | 'level' | 'country' | 'city'
>;

const SAFE_SELECT = {
  id: true, email: true, username: true, displayName: true,
  avatarUrl: true, role: true, xp: true, level: true, country: true, city: true,
} as const;

function normalizeUsername(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
}

export async function registerUser(input: {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}): Promise<SafeUser> {
  const email = input.email.trim().toLowerCase();
  const username = normalizeUsername(input.username);
  if (username.length < 3) throw badRequest('Username must be at least 3 characters (letters, numbers, _).');

  const clash = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { email: true, username: true },
  });
  if (clash?.email === email) throw conflict('An account with this email already exists.');
  if (clash?.username === username) throw conflict('That username is taken.');

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email,
      username,
      displayName: input.displayName?.trim() || username,
      passwordHash,
      profile: { create: {} },
    },
    select: SAFE_SELECT,
  });
  return user;
}

export async function loginUser(input: { emailOrUsername: string; password: string }): Promise<SafeUser> {
  const id = input.emailOrUsername.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: id }, { username: normalizeUsername(id) }] },
  });
  if (!user || !user.passwordHash) throw unauthorized('Invalid credentials.');
  if (user.isBanned) throw unauthorized('This account is banned.');

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw unauthorized('Invalid credentials.');

  return pickSafe(user);
}

/** Verify a Google ID token (from the SPA) and find-or-create the user. */
export async function loginWithGoogle(idToken: string): Promise<SafeUser> {
  if (!googleClient) throw badRequest('Google login is not configured.');
  const ticket = await googleClient.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload?.email || !payload.sub) throw unauthorized('Google token missing email.');

  const existing = await prisma.user.findFirst({
    where: { OR: [{ googleId: payload.sub }, { email: payload.email.toLowerCase() }] },
  });
  if (existing) {
    if (!existing.googleId) {
      await prisma.user.update({ where: { id: existing.id }, data: { googleId: payload.sub } });
    }
    return pickSafe(existing);
  }

  // Derive a unique username from the email local part.
  const base = normalizeUsername(payload.email.split('@')[0] ?? 'player') || 'player';
  let username = base;
  for (let i = 0; (await prisma.user.findUnique({ where: { username } })); i++) {
    username = `${base}${i + 1}`;
  }

  const user = await prisma.user.create({
    data: {
      email: payload.email.toLowerCase(),
      googleId: payload.sub,
      username,
      displayName: payload.name ?? username,
      avatarUrl: payload.picture ?? null,
      profile: { create: {} },
    },
  });
  return pickSafe(user);
}

export async function getSafeUser(userId: string): Promise<SafeUser | null> {
  return prisma.user.findUnique({ where: { id: userId }, select: SAFE_SELECT });
}

function pickSafe(user: User): SafeUser {
  return {
    id: user.id, email: user.email, username: user.username, displayName: user.displayName,
    avatarUrl: user.avatarUrl, role: user.role, xp: user.xp, level: user.level,
    country: user.country, city: user.city,
  };
}
