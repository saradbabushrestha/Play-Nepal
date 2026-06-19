import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { customAlphabet } from 'nanoid';

const SALT_ROUNDS = 12;

export const hashPassword = (plain: string) => bcrypt.hash(plain, SALT_ROUNDS);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

// Unambiguous alphabet (no 0/O/1/I) for human-typed room codes.
const roomAlphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const makeRoomCode = customAlphabet(roomAlphabet, 6);

/** Opaque refresh token + its hash for at-rest storage. */
export function makeRefreshToken() {
  const token = randomBytes(48).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
}

export const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');
