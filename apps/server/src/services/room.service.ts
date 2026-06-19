import type { Prisma } from '@prisma/client';
import { GAME_CATALOG, type RoomMember, type RoomSummary } from '@play-nepal/shared';
import { prisma } from '../prisma.js';
import { badRequest, forbidden, notFound } from '../utils/http.js';
import { hashPassword, makeRoomCode, verifyPassword } from '../utils/crypto.js';

const catalogById = new Map(GAME_CATALOG.map((g) => [g.id, g]));

const roomInclude = {
  members: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } },
  game: true,
} satisfies Prisma.RoomInclude;

type RoomWithMembers = Prisma.RoomGetPayload<{ include: typeof roomInclude }>;

export async function createRoom(input: {
  hostId: string;
  name: string;
  gameId: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  password?: string;
  maxPlayers?: number;
}): Promise<RoomWithMembers> {
  const meta = catalogById.get(input.gameId);
  if (!meta) throw badRequest('Unknown game.');

  const maxPlayers = Math.min(
    Math.max(input.maxPlayers ?? meta.maxPlayers, meta.minPlayers),
    meta.maxPlayers,
  );

  // Generate a unique code (retry on the rare collision).
  let code = makeRoomCode();
  for (let i = 0; i < 5 && (await prisma.room.findUnique({ where: { code } })); i++) {
    code = makeRoomCode();
  }

  const passwordHash = input.password ? await hashPassword(input.password) : null;

  return prisma.room.create({
    data: {
      code,
      name: input.name.trim().slice(0, 60) || `${meta.name} room`,
      gameId: input.gameId,
      hostId: input.hostId,
      visibility: input.visibility,
      passwordHash,
      maxPlayers,
      members: { create: { userId: input.hostId, role: 'HOST', seat: 0, ready: true } },
    },
    include: roomInclude,
  });
}

export async function getRoomByCode(code: string): Promise<RoomWithMembers | null> {
  return prisma.room.findUnique({ where: { code: code.toUpperCase() }, include: roomInclude });
}

export async function getRoomById(id: string): Promise<RoomWithMembers | null> {
  return prisma.room.findUnique({ where: { id }, include: roomInclude });
}

export async function listPublicRooms(): Promise<RoomSummary[]> {
  const rooms = await prisma.room.findMany({
    where: {
      visibility: 'PUBLIC',
      status: { not: 'FINISHED' },
      members: { some: { connected: true } }, // hide rooms nobody is connected to
    },
    include: roomInclude,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return rooms.map(toRoomSummary);
}

/** Add a member (player or spectator), enforcing capacity, bans and password. */
export async function joinRoom(input: {
  roomId: string;
  userId: string;
  password?: string;
  asSpectator?: boolean;
}): Promise<RoomWithMembers> {
  const room = await getRoomById(input.roomId);
  if (!room) throw notFound('Room not found.');
  if (room.status === 'FINISHED') throw badRequest('This room has closed.');

  const banned = await prisma.roomBan.findUnique({
    where: { roomId_userId: { roomId: room.id, userId: input.userId } },
  });
  if (banned) throw forbidden('You are banned from this room.');

  const already = room.members.find((m) => m.userId === input.userId);
  if (already) {
    if (!already.connected) {
      await prisma.roomMember.update({ where: { id: already.id }, data: { connected: true } });
    }
    return (await getRoomById(room.id))!;
  }

  if (room.passwordHash && !input.asSpectator) {
    if (!input.password || !(await verifyPassword(input.password, room.passwordHash))) {
      throw forbidden('Incorrect room password.');
    }
  }

  const players = room.members.filter((m) => m.role !== 'SPECTATOR');
  const wantsPlay = !input.asSpectator && players.length < room.maxPlayers && room.status === 'LOBBY';
  const usedSeats = new Set(players.map((m) => m.seat));
  let seat: number | null = null;
  if (wantsPlay) {
    for (let s = 0; s < room.maxPlayers; s++) {
      if (!usedSeats.has(s)) { seat = s; break; }
    }
  }

  await prisma.roomMember.create({
    data: {
      roomId: room.id,
      userId: input.userId,
      role: wantsPlay ? 'PLAYER' : 'SPECTATOR',
      seat,
    },
  });
  return (await getRoomById(room.id))!;
}

export async function leaveRoom(roomId: string, userId: string): Promise<void> {
  const room = await getRoomById(roomId);
  if (!room) return;
  await prisma.roomMember.deleteMany({ where: { roomId, userId } });

  const remaining = await prisma.roomMember.findMany({ where: { roomId }, orderBy: { joinedAt: 'asc' } });
  if (remaining.length === 0) {
    await prisma.room.update({ where: { id: roomId }, data: { status: 'FINISHED', closedAt: new Date() } });
    return;
  }
  // Reassign host if the host left.
  if (room.hostId === userId) {
    const next = remaining[0]!;
    await prisma.$transaction([
      prisma.room.update({ where: { id: roomId }, data: { hostId: next.userId } }),
      prisma.roomMember.update({ where: { id: next.id }, data: { role: 'HOST' } }),
    ]);
  }
}

/** Non-finished rooms the user belongs to (used on disconnect). */
export async function getUserActiveRoomIds(userId: string): Promise<string[]> {
  const members = await prisma.roomMember.findMany({
    where: { userId, room: { status: { not: 'FINISHED' } } },
    select: { roomId: true },
  });
  return members.map((m) => m.roomId);
}

export async function setMemberConnected(roomId: string, userId: string, connected: boolean): Promise<void> {
  await prisma.roomMember.updateMany({ where: { roomId, userId }, data: { connected } }).catch(() => {});
}

/** Close a room: mark it FINISHED and abandon any active match. */
export async function closeRoom(roomId: string): Promise<void> {
  await prisma.room.updateMany({
    where: { id: roomId, status: { not: 'FINISHED' } },
    data: { status: 'FINISHED', closedAt: new Date() },
  });
  await prisma.match.updateMany({
    where: { roomId, status: 'ACTIVE' },
    data: { status: 'ABANDONED', finishedAt: new Date() },
  });
}

/** Hand the host role to a still-present member if the host has gone. */
export async function reassignHostToPresent(roomId: string, presentUserIds: string[]): Promise<boolean> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { members: { orderBy: { joinedAt: 'asc' } } },
  });
  if (!room || room.status === 'FINISHED' || presentUserIds.includes(room.hostId)) return false;
  const next = room.members.find((m) => presentUserIds.includes(m.userId));
  if (!next) return false;
  await prisma.$transaction([
    prisma.room.update({ where: { id: roomId }, data: { hostId: next.userId } }),
    prisma.roomMember.updateMany({ where: { roomId, userId: next.userId }, data: { role: 'HOST' } }),
  ]);
  return true;
}

/** Open rooms older than `minAgeMs` — candidates the reaper checks for presence. */
export async function listReapableRooms(minAgeMs: number): Promise<string[]> {
  const rooms = await prisma.room.findMany({
    where: { status: { not: 'FINISHED' }, createdAt: { lt: new Date(Date.now() - minAgeMs) } },
    select: { id: true },
  });
  return rooms.map((r) => r.id);
}

export async function kickMember(roomId: string, hostId: string, targetUserId: string, ban = false): Promise<void> {
  const room = await getRoomById(roomId);
  if (!room) throw notFound('Room not found.');
  if (room.hostId !== hostId) throw forbidden('Only the host can kick players.');
  if (targetUserId === hostId) throw badRequest('You cannot kick yourself.');

  await prisma.roomMember.deleteMany({ where: { roomId, userId: targetUserId } });
  if (ban) {
    await prisma.roomBan.upsert({
      where: { roomId_userId: { roomId, userId: targetUserId } },
      update: {},
      create: { roomId, userId: targetUserId },
    });
  }
}

export async function setReady(roomId: string, userId: string, ready: boolean): Promise<void> {
  await prisma.roomMember.updateMany({ where: { roomId, userId }, data: { ready } });
}

export function toRoomSummary(room: RoomWithMembers): RoomSummary {
  const players = room.members.filter((m) => m.role !== 'SPECTATOR');
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    gameId: room.gameId,
    visibility: room.visibility,
    hasPassword: Boolean(room.passwordHash),
    status: room.status,
    hostUserId: room.hostId,
    memberCount: players.length,
    maxPlayers: room.maxPlayers,
    spectatorCount: room.members.length - players.length,
  };
}

export function toRoomMembers(room: RoomWithMembers): RoomMember[] {
  return room.members.map((m) => ({
    userId: m.userId,
    username: m.user.username,
    displayName: m.user.displayName,
    avatarUrl: m.user.avatarUrl,
    role: m.role,
    team: m.team,
    seat: m.seat,
    ready: m.ready,
    connected: m.connected,
  }));
}

export type { RoomWithMembers };
