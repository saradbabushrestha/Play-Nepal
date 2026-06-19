import type { ChatMessage, FriendActivityItem, GameResult, PresenceActivity, RoomMember, RoomSummary } from './types.js';

// ─────────────────────────────────────────────────────────────
// The Socket.io contract. Importing these on both ends gives fully
// type-checked, autocompleted real-time events.
// ─────────────────────────────────────────────────────────────

/** Public snapshot of a live match sent to clients (state is engine-specific). */
export interface MatchSnapshot {
  matchId: string;
  roomId: string;
  gameId: string;
  /** Engine state, already passed through the engine's `viewFor` for this viewer. */
  state: unknown;
  /** Engine playerId whose turn it is, or null. */
  turn: string | null;
  result: GameResult | null;
  /** Monotonic version for optimistic-update reconciliation. */
  version: number;
  seats: Array<{ seat: number; playerId: string; userId: string | null; displayName: string; isAI: boolean }>;
}

export interface RoomStateSnapshot {
  room: RoomSummary;
  members: RoomMember[];
  messages: ChatMessage[];
  match: MatchSnapshot | null;
}

/** Events the client emits to the server. The last arg is an ack callback. */
export interface ClientToServerEvents {
  'room:join': (payload: { code: string; password?: string; asSpectator?: boolean }, ack: Ack<RoomStateSnapshot>) => void;
  'room:leave': (payload: { roomId: string }, ack: Ack<{ ok: true }>) => void;
  'room:ready': (payload: { roomId: string; ready: boolean }, ack: Ack<{ ok: true }>) => void;
  'room:start': (payload: { roomId: string }, ack: Ack<MatchSnapshot>) => void;
  'room:kick': (payload: { roomId: string; userId: string }, ack: Ack<{ ok: true }>) => void;
  'room:chat': (payload: { roomId: string; body: string }, ack: Ack<{ ok: true }>) => void;
  'room:react': (payload: { roomId: string; emoji: string }) => void;

  'game:move': (payload: { matchId: string; move: unknown }, ack: Ack<MatchSnapshot>) => void;
  'game:resign': (payload: { matchId: string }, ack: Ack<{ ok: true }>) => void;
  'game:rematch': (payload: { roomId: string }, ack: Ack<{ ok: true }>) => void;

  // Ephemeral drawing strokes (Draw & Guess) — broadcast, not persisted.
  'draw:stroke': (payload: { roomId: string; stroke: DrawStroke }) => void;
  'draw:clear': (payload: { roomId: string }) => void;
}

/** A single drawn segment, in normalised 0–1 board coordinates. */
export interface DrawStroke {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color: string;
  width: number;
}

/** What a player earned from a finished match (shown on the result screen). */
export interface MatchReward {
  outcome: 'WIN' | 'LOSS' | 'DRAW';
  ratingDelta: number;
  newRating: number;
  xpEarned: number;
  newXp: number;
  newLevel: number;
  leveledUp: boolean;
  ranked: boolean;
}

/** Events the server pushes to clients. */
export interface ServerToClientEvents {
  'room:state': (snapshot: RoomStateSnapshot) => void;
  'room:member-joined': (member: RoomMember) => void;
  'room:member-left': (payload: { userId: string }) => void;
  'room:chat': (message: ChatMessage) => void;
  'room:react': (payload: { userId: string; emoji: string }) => void;
  'room:kicked': (payload: { roomId: string; reason: string }) => void;

  'game:started': (snapshot: MatchSnapshot) => void;
  'game:update': (snapshot: MatchSnapshot) => void;
  'game:over': (payload: { matchId: string; result: GameResult; snapshot: MatchSnapshot; reward?: MatchReward | null }) => void;

  'draw:stroke': (stroke: DrawStroke) => void;
  'draw:clear': () => void;

  // Live social — pushed to a user's friends.
  'friend:presence': (payload: { userId: string; online: boolean; activity: PresenceActivity | null }) => void;
  'friend:event': (item: FriendActivityItem) => void;
  'friend:request': (payload: { fromUserId: string; fromUsername: string; fromDisplayName: string }) => void;
  'friend:accepted': (payload: { userId: string; username: string; displayName: string }) => void;

  error: (payload: { code: string; message: string }) => void;
}

/** Per-socket auth/session data attached on connect. */
export interface SocketData {
  userId: string;
  username: string;
}

export type Ack<T> = (response: { ok: true; data: T } | { ok: false; error: string }) => void;

/** Names as constants to avoid typos in non-typed call sites. */
export const SOCKET_EVENTS = {
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_READY: 'room:ready',
  ROOM_START: 'room:start',
  ROOM_KICK: 'room:kick',
  ROOM_CHAT: 'room:chat',
  GAME_MOVE: 'game:move',
  GAME_RESIGN: 'game:resign',
  GAME_REMATCH: 'game:rematch',
} as const;
