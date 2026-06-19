import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, notFound, parseOrThrow } from '../../utils/http.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createRoom,
  getRoomByCode,
  listPublicRooms,
  toRoomMembers,
  toRoomSummary,
} from '../../services/room.service.js';

export const roomRouter: Router = Router();

const createSchema = z.object({
  name: z.string().min(1).max(60),
  gameId: z.string().min(1),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC'),
  password: z.string().min(1).max(64).optional(),
  maxPlayers: z.number().int().min(1).max(50).optional(),
});

// Browse the public lobby.
roomRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rooms = await listPublicRooms();
    res.json({ ok: true, data: { rooms } });
  }),
);

// Create a room (the heavy lifting of join/start happens over sockets).
roomRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = parseOrThrow(createSchema, req.body);
    const room = await createRoom({ hostId: req.auth!.sub, ...input });
    res.status(201).json({
      ok: true,
      data: { room: toRoomSummary(room), members: toRoomMembers(room) },
    });
  }),
);

// Resolve a join code → room summary (so the UI can preview before joining).
roomRouter.get(
  '/:code',
  asyncHandler(async (req, res) => {
    const room = await getRoomByCode(req.params.code);
    if (!room) throw notFound('No room with that code.');
    res.json({ ok: true, data: { room: toRoomSummary(room), members: toRoomMembers(room) } });
  }),
);
