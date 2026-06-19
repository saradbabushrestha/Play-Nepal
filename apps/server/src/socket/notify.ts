import type { Server } from 'socket.io';

// A tiny bridge so non-socket code (REST routes, services) can push live
// events to a user's personal channel (`user:<id>`).
let io: Server | null = null;

export function setNotifier(server: Server): void {
  io = server;
}

export function emitToUser(userId: string, event: string, payload?: unknown): void {
  io?.to(`user:${userId}`).emit(event as never, payload as never);
}

export function emitToUsers(userIds: string[], event: string, payload?: unknown): void {
  for (const id of userIds) emitToUser(id, event, payload);
}
