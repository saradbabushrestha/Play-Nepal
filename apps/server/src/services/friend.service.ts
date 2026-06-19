import { prisma } from '../prisma.js';
import { badRequest, conflict, notFound } from '../utils/http.js';

/** Friendships are stored once per pair with userAId < userBId. */
const pair = (a: string, b: string) => (a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a });

export async function getFriendIds(userId: string): Promise<string[]> {
  const fs = await prisma.friendship.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    select: { userAId: true, userBId: true },
  });
  return fs.map((f) => (f.userAId === userId ? f.userBId : f.userAId));
}

export async function listFriends(userId: string) {
  const ids = await getFriendIds(userId);
  return prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, username: true, displayName: true, avatarUrl: true, level: true },
    orderBy: { displayName: 'asc' },
  });
}

export async function listRequests(userId: string) {
  return prisma.friendRequest.findMany({
    where: { toUserId: userId, status: 'PENDING' },
    include: { fromUser: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

/** Send a friend request by username. Auto-accepts if the reverse is pending. */
export async function sendRequest(fromUserId: string, username: string) {
  const to = await prisma.user.findUnique({ where: { username: username.trim().toLowerCase() } });
  if (!to) throw notFound('No player with that username.');
  if (to.id === fromUserId) throw badRequest('You can’t add yourself.');

  const existing = await prisma.friendship.findUnique({ where: { userAId_userBId: pair(fromUserId, to.id) } });
  if (existing) throw conflict('You’re already friends.');

  const reverse = await prisma.friendRequest.findUnique({
    where: { fromUserId_toUserId: { fromUserId: to.id, toUserId: fromUserId } },
  });
  if (reverse && reverse.status === 'PENDING') {
    await acceptInternal(reverse.id, fromUserId);
    return { accepted: true as const, friend: { id: to.id, username: to.username, displayName: to.displayName } };
  }

  await prisma.friendRequest.upsert({
    where: { fromUserId_toUserId: { fromUserId, toUserId: to.id } },
    update: { status: 'PENDING' },
    create: { fromUserId, toUserId: to.id, status: 'PENDING' },
  });
  return { accepted: false as const, to: { id: to.id, username: to.username, displayName: to.displayName } };
}

async function acceptInternal(requestId: string, accepterId: string) {
  const req = await prisma.friendRequest.findUnique({ where: { id: requestId } });
  if (!req || req.toUserId !== accepterId || req.status !== 'PENDING') throw notFound('Request not found.');
  await prisma.$transaction([
    prisma.friendRequest.update({ where: { id: requestId }, data: { status: 'ACCEPTED' } }),
    prisma.friendship.upsert({ where: { userAId_userBId: pair(req.fromUserId, req.toUserId) }, update: {}, create: pair(req.fromUserId, req.toUserId) }),
  ]);
  return req;
}

export async function acceptRequest(userId: string, requestId: string) {
  return acceptInternal(requestId, userId);
}

export async function declineRequest(userId: string, requestId: string): Promise<void> {
  await prisma.friendRequest.updateMany({ where: { id: requestId, toUserId: userId, status: 'PENDING' }, data: { status: 'DECLINED' } });
}

export async function removeFriend(userId: string, friendId: string): Promise<void> {
  await prisma.friendship.deleteMany({ where: pair(userId, friendId) });
}
