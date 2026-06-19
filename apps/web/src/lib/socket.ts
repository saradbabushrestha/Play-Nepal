import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@play-nepal/shared';
import { getAccessToken } from './api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? '';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

/** Lazily create the singleton socket, authenticating with the access token. */
export function getSocket(): AppSocket {
  if (socket) return socket;
  socket = io(SOCKET_URL || undefined, {
    autoConnect: false,
    transports: ['websocket'],
    auth: (cb) => cb({ token: getAccessToken() ?? '' }),
  });
  return socket;
}

export function connectSocket(): AppSocket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  socket?.disconnect();
}

interface LooseEmitter {
  timeout: (ms: number) => {
    emit: (event: string, payload: unknown, cb: (err: unknown, res: unknown) => void) => void;
  };
}

/** Promise wrapper around an emit-with-ack call. */
export function emitAck<T>(event: string, payload: unknown): Promise<T> {
  const socket = getSocket() as unknown as LooseEmitter;
  return new Promise((resolve, reject) => {
    socket.timeout(8000).emit(event, payload, (err: unknown, res: unknown) => {
      if (err) return reject(new Error('Request timed out'));
      const r = res as { ok: boolean; data?: T; error?: string };
      if (!r?.ok) return reject(new Error(r?.error ?? 'Action failed'));
      resolve(r.data as T);
    });
  });
}
