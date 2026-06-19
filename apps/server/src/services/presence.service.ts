import type { PresenceActivity } from '@play-nepal/shared';

// In-memory presence (single-node). For multi-node, back this with Redis
// (see docs/SCALING.md) — the interface stays the same.
const activity = new Map<string, PresenceActivity>();
const connections = new Map<string, number>(); // ref-count of live sockets per user

export function setOnline(userId: string): void {
  connections.set(userId, (connections.get(userId) ?? 0) + 1);
  if (!activity.has(userId)) activity.set(userId, { status: 'online' });
}

export function setActivity(userId: string, next: PresenceActivity): void {
  if (connections.has(userId)) activity.set(userId, next);
}

/** Decrement a socket; the user goes offline only when their last one closes. */
export function setOffline(userId: string): void {
  const c = (connections.get(userId) ?? 1) - 1;
  if (c <= 0) { connections.delete(userId); activity.delete(userId); }
  else connections.set(userId, c);
}

export function isOnline(userId: string): boolean {
  return (connections.get(userId) ?? 0) > 0;
}

export function getActivity(userId: string): PresenceActivity | null {
  return activity.get(userId) ?? null;
}
