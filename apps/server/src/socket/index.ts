import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  FriendActivityItem,
  GameResult,
  RoomStateSnapshot,
  ServerToClientEvents,
  SocketData,
} from '@play-nepal/shared';
import { GAME_CATALOG } from '@play-nepal/shared';
import { env } from '../env.js';
import { logger } from '../logger.js';
import { prisma } from '../prisma.js';
import { verifyAccessToken } from '../services/token.service.js';
import {
  closeRoom,
  getRoomByCode,
  getRoomById,
  getUserActiveRoomIds,
  joinRoom,
  kickMember,
  leaveRoom,
  listReapableRooms,
  reassignHostToPresent,
  setMemberConnected,
  setReady,
  toRoomMembers,
  toRoomSummary,
  type RoomWithMembers,
} from '../services/room.service.js';
import { MatchRuntime } from './match-runtime.js';
import { setNotifier } from './notify.js';
import { getActivity, isOnline, setActivity, setOffline, setOnline } from '../services/presence.service.js';
import { getFriendIds } from '../services/friend.service.js';

const gameName = (id: string) => GAME_CATALOG.find((g) => g.id === id)?.name ?? id;

type IO = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

const roomChannel = (roomId: string) => `room:${roomId}`;

/** Distinct userIds with a live socket currently in a room — the source of
 *  truth for "is anyone actually here". */
async function presentUserIds(io: IO, roomId: string): Promise<string[]> {
  const sockets = await io.in(roomChannel(roomId)).fetchSockets();
  return [...new Set(sockets.map((s) => s.data.userId))];
}

/** Close a room when its socket channel is empty; otherwise hand off the host. */
async function reconcileRoom(io: IO, roomId: string, runtime: MatchRuntime): Promise<void> {
  const present = await presentUserIds(io, roomId);
  if (present.length === 0) {
    await closeRoom(roomId);
    return;
  }
  await reassignHostToPresent(roomId, present);
  const room = await getRoomById(roomId);
  if (room) io.to(roomChannel(roomId)).emit('room:state', await buildRoomState(room, runtime));
}

async function buildRoomState(room: RoomWithMembers, runtime: MatchRuntime, viewerId: string | null = null): Promise<RoomStateSnapshot> {
  const messages = await prisma.chatMessage.findMany({
    where: { roomId: room.id },
    orderBy: { createdAt: 'desc' },
    take: 40,
    include: { user: { select: { username: true } } },
  });
  const live = runtime.getByRoom(room.id);
  return {
    room: toRoomSummary(room),
    members: toRoomMembers(room),
    messages: messages.reverse().map((m) => ({
      id: m.id,
      userId: m.userId,
      username: m.user.username,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
    })),
    match: live && !live.finished ? runtime.snapshot(live, viewerId) : null,
  };
}

export function attachSocketServer(httpServer: HttpServer): IO {
  const io: IO = new Server(httpServer, {
    cors: { origin: env.WEB_ORIGIN.split(',').map((o) => o.trim()), credentials: true },
    pingTimeout: 20_000,
  });

  const runtime = new MatchRuntime(io as unknown as Server);
  setNotifier(io as unknown as Server);

  const notifyFriendsPresence = async (uid: string) => {
    const ids = await getFriendIds(uid).catch(() => [] as string[]);
    if (!ids.length) return;
    const payload = { userId: uid, online: isOnline(uid), activity: getActivity(uid) };
    for (const fid of ids) io.to(`user:${fid}`).emit('friend:presence', payload);
  };
  const pushFriendEvent = async (uid: string, item: FriendActivityItem) => {
    const ids = await getFriendIds(uid).catch(() => [] as string[]);
    for (const fid of ids) io.to(`user:${fid}`).emit('friend:event', item);
  };

  // When a match ends, push a result to each player's friends.
  runtime.onFinish = (_roomId: string, gameId: string, userIds: string[], result: GameResult) => {
    void (async () => {
      const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true, displayName: true, avatarUrl: true } }).catch(() => []);
      for (const u of users) {
        const outcome = result.draw ? 'DRAW' : result.winnerId === u.id ? 'WIN' : 'LOSS';
        await pushFriendEvent(u.id, { userId: u.id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl, kind: 'result', gameName: gameName(gameId), outcome, at: new Date().toISOString() });
        setActivity(u.id, { status: 'in-lobby', gameId, gameName: gameName(gameId) });
        await notifyFriendsPresence(u.id);
      }
    })();
  };

  // ── Auth handshake ──
  io.use((socket, next) => {
    const token = (socket.handshake.auth as { token?: string })?.token;
    if (!token) return next(new Error('Missing auth token'));
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      socket.data.username = payload.username;
      next();
    } catch {
      next(new Error('Invalid auth token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId, username } = socket.data;
    logger.debug({ userId, username }, 'socket connected');
    // Personal channel for direct notifications.
    void socket.join(`user:${userId}`);
    void prisma.user.update({ where: { id: userId }, data: { isOnline: true, lastSeenAt: new Date() } }).catch(() => {});
    setOnline(userId);
    void notifyFriendsPresence(userId);

    const ackError = (ack: unknown, error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      if (typeof ack === 'function') ack({ ok: false, error: message });
      socket.emit('error', { code: 'ACTION_FAILED', message });
    };

    // ── Rooms ──
    socket.on('room:join', async (payload, ack) => {
      try {
        const found = await getRoomByCode(payload.code);
        if (!found) throw new Error('Room not found.');
        const room = await joinRoom({
          roomId: found.id,
          userId,
          password: payload.password,
          asSpectator: payload.asSpectator,
        });
        await socket.join(roomChannel(room.id));
        ack({ ok: true, data: await buildRoomState(room, runtime, userId) });
        socket.to(roomChannel(room.id)).emit('room:state', await buildRoomState(room, runtime, null));
        const live = runtime.getByRoom(room.id);
        setActivity(userId, { status: live && !live.finished ? 'in-game' : 'in-lobby', gameId: room.gameId, gameName: gameName(room.gameId), roomCode: room.code });
        void notifyFriendsPresence(userId);
      } catch (err) {
        ackError(ack, err);
      }
    });

    socket.on('room:leave', async (payload, ack) => {
      try {
        await leaveRoom(payload.roomId, userId);
        await socket.leave(roomChannel(payload.roomId));
        setActivity(userId, { status: 'online' });
        void notifyFriendsPresence(userId);
        ack({ ok: true, data: { ok: true } });
        const room = await getRoomById(payload.roomId);
        if (room) io.to(roomChannel(room.id)).emit('room:state', await buildRoomState(room, runtime));
        else io.to(roomChannel(payload.roomId)).emit('room:member-left', { userId });
      } catch (err) {
        ackError(ack, err);
      }
    });

    socket.on('room:ready', async (payload, ack) => {
      try {
        await setReady(payload.roomId, userId, payload.ready);
        ack({ ok: true, data: { ok: true } });
        const room = await getRoomById(payload.roomId);
        if (room) io.to(roomChannel(room.id)).emit('room:state', await buildRoomState(room, runtime));
      } catch (err) {
        ackError(ack, err);
      }
    });

    socket.on('room:start', async (payload, ack) => {
      try {
        const room = await getRoomById(payload.roomId);
        if (!room) throw new Error('Room not found.');
        if (room.hostId !== userId) throw new Error('Only the host can start the game.');
        const match = await runtime.startMatch(room);
        ack({ ok: true, data: runtime.snapshot(match, userId) });
        // Mark all human players in-game and tell their friends a game started.
        for (const p of match.players.filter((pl) => !pl.isAI && pl.userId)) {
          setActivity(p.userId!, { status: 'in-game', gameId: room.gameId, gameName: gameName(room.gameId), roomCode: room.code });
          void notifyFriendsPresence(p.userId!);
        }
        void pushFriendEvent(userId, { userId, username, displayName: username, avatarUrl: null, kind: 'started', gameName: gameName(room.gameId), at: new Date().toISOString() });
      } catch (err) {
        ackError(ack, err);
      }
    });

    socket.on('room:kick', async (payload, ack) => {
      try {
        await kickMember(payload.roomId, userId, payload.userId);
        ack({ ok: true, data: { ok: true } });
        io.to(`user:${payload.userId}`).emit('room:kicked', { roomId: payload.roomId, reason: 'Removed by host' });
        const room = await getRoomById(payload.roomId);
        if (room) io.to(roomChannel(room.id)).emit('room:state', await buildRoomState(room, runtime));
      } catch (err) {
        ackError(ack, err);
      }
    });

    socket.on('room:chat', async (payload, ack) => {
      try {
        const body = payload.body.trim().slice(0, 500);
        if (!body) throw new Error('Empty message.');
        const msg = await prisma.chatMessage.create({ data: { roomId: payload.roomId, userId, body } });
        ack({ ok: true, data: { ok: true } });
        io.to(roomChannel(payload.roomId)).emit('room:chat', {
          id: msg.id,
          userId,
          username,
          body,
          createdAt: msg.createdAt.toISOString(),
        });
      } catch (err) {
        ackError(ack, err);
      }
    });

    socket.on('room:react', (payload) => {
      io.to(roomChannel(payload.roomId)).emit('room:react', { userId, emoji: payload.emoji.slice(0, 8) });
    });

    // Ephemeral drawing strokes (Draw & Guess) — relayed to the room, not stored.
    socket.on('draw:stroke', (payload) => {
      socket.to(roomChannel(payload.roomId)).emit('draw:stroke', payload.stroke);
    });
    socket.on('draw:clear', (payload) => {
      socket.to(roomChannel(payload.roomId)).emit('draw:clear');
    });

    // ── Gameplay ──
    socket.on('game:move', async (payload, ack) => {
      try {
        const snapshot = await runtime.applyMove(payload.matchId, userId, payload.move);
        ack({ ok: true, data: snapshot });
      } catch (err) {
        ackError(ack, err);
      }
    });

    socket.on('game:resign', async (payload, ack) => {
      try {
        await runtime.resign(payload.matchId, userId);
        ack({ ok: true, data: { ok: true } });
      } catch (err) {
        ackError(ack, err);
      }
    });

    socket.on('disconnect', async () => {
      logger.debug({ userId }, 'socket disconnected');
      await prisma.user
        .update({ where: { id: userId }, data: { isOnline: false, lastSeenAt: new Date() } })
        .catch(() => {});
      setOffline(userId);
      void notifyFriendsPresence(userId);

      // Tear down the user's rooms. We wait briefly so a quick reconnect (HMR,
      // flaky network) can rejoin before we decide the room is abandoned.
      const roomIds = await getUserActiveRoomIds(userId).catch(() => [] as string[]);
      if (roomIds.length === 0) return;
      setTimeout(() => {
        void (async () => {
          for (const roomId of roomIds) {
            await setMemberConnected(roomId, userId, false);
            await reconcileRoom(io, roomId, runtime).catch((err) =>
              logger.error({ err, roomId }, 'room reconcile failed'),
            );
          }
        })();
      }, 2000);
    });
  });

  // Safety-net reaper: close any open room whose socket channel is empty.
  const reap = async () => {
    const ids = await listReapableRooms(30_000).catch(() => [] as string[]);
    for (const roomId of ids) {
      if ((await presentUserIds(io, roomId)).length === 0) {
        await closeRoom(roomId).catch(() => {});
      }
    }
  };
  setTimeout(() => void reap(), 8_000); // clear leftovers shortly after boot
  setInterval(() => void reap(), 45_000);

  return io;
}
