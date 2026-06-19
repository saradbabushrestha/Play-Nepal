import { Router } from 'express';
import { z } from 'zod';
import type { FriendRequestSummary, FriendSummary } from '@play-nepal/shared';
import { asyncHandler, parseOrThrow } from '../../utils/http.js';
import { requireAuth } from '../middleware/auth.js';
import { acceptRequest, declineRequest, listFriends, listRequests, removeFriend, sendRequest } from '../../services/friend.service.js';
import { getActivity, isOnline } from '../../services/presence.service.js';
import { emitToUser } from '../../socket/notify.js';
import { getSafeUser } from '../../services/auth.service.js';

export const friendRouter: Router = Router();

friendRouter.use(requireAuth);

// List my friends with live presence.
friendRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const friends = await listFriends(req.auth!.sub);
    const rows: FriendSummary[] = friends.map((f) => ({
      ...f,
      online: isOnline(f.id),
      activity: getActivity(f.id),
    }));
    // Online first, then by name.
    rows.sort((a, b) => Number(b.online) - Number(a.online) || a.displayName.localeCompare(b.displayName));
    res.json({ ok: true, data: { friends: rows } });
  }),
);

friendRouter.get(
  '/requests',
  asyncHandler(async (req, res) => {
    const reqs = await listRequests(req.auth!.sub);
    const rows: FriendRequestSummary[] = reqs.map((r) => ({
      id: r.id,
      fromUserId: r.fromUser.id,
      fromUsername: r.fromUser.username,
      fromDisplayName: r.fromUser.displayName,
      fromAvatarUrl: r.fromUser.avatarUrl,
      createdAt: r.createdAt.toISOString(),
    }));
    res.json({ ok: true, data: { requests: rows } });
  }),
);

friendRouter.post(
  '/request',
  asyncHandler(async (req, res) => {
    const { username } = parseOrThrow(z.object({ username: z.string().min(1).max(30) }), req.body);
    const me = await getSafeUser(req.auth!.sub);
    const result = await sendRequest(req.auth!.sub, username);
    if (result.accepted) {
      // Mutual request → instant friendship. Tell both sides.
      emitToUser(result.friend.id, 'friend:accepted', { userId: me!.id, username: me!.username, displayName: me!.displayName });
    } else if (me) {
      emitToUser(result.to.id, 'friend:request', { fromUserId: me.id, fromUsername: me.username, fromDisplayName: me.displayName });
    }
    res.json({ ok: true, data: { accepted: result.accepted } });
  }),
);

friendRouter.post(
  '/requests/:id/accept',
  asyncHandler(async (req, res) => {
    const reqRow = await acceptRequest(req.auth!.sub, req.params.id);
    const me = await getSafeUser(req.auth!.sub);
    if (me) emitToUser(reqRow.fromUserId, 'friend:accepted', { userId: me.id, username: me.username, displayName: me.displayName });
    res.json({ ok: true, data: { ok: true } });
  }),
);

friendRouter.post(
  '/requests/:id/decline',
  asyncHandler(async (req, res) => {
    await declineRequest(req.auth!.sub, req.params.id);
    res.json({ ok: true, data: { ok: true } });
  }),
);

friendRouter.delete(
  '/:friendId',
  asyncHandler(async (req, res) => {
    await removeFriend(req.auth!.sub, req.params.friendId);
    res.json({ ok: true, data: { ok: true } });
  }),
);
