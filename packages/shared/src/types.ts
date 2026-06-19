// ─────────────────────────────────────────────────────────────
// Domain types shared between the Play Nepal server and web client.
// ─────────────────────────────────────────────────────────────

export type GameCategory =
  | 'NEPALI_TRADITIONAL'
  | 'BOARD'
  | 'OFFICE'
  | 'PARTY'
  | 'EDUCATIONAL'
  | 'CASUAL';

/** Stable string ids for every game in the catalogue. */
export type GameId =
  // Nepali traditional
  | 'baghchal'
  | 'langur-burja'
  | 'gatti'
  | 'nepali-quiz'
  // Board
  | 'tic-tac-toe'
  | 'connect-4'
  | 'chess'
  | 'checkers'
  | 'ludo'
  | 'snakes-ladders'
  | 'carrom'
  // (office / party / educational / casual ids added as games ship)
  | (string & {});

export interface GameMeta {
  id: GameId;
  name: string;
  category: GameCategory;
  /** Min/max human players a single match supports. */
  minPlayers: number;
  maxPlayers: number;
  /** Whether the engine ships an AI opponent. */
  supportsAI: boolean;
  /** Whether spectators can watch live. */
  supportsSpectators: boolean;
  /** Whether matches are ranked (affect ELO / leaderboard). */
  ranked: boolean;
  shortDescription: string;
  /** Whether this game is fully implemented & playable today. */
  status: 'live' | 'beta' | 'planned';
}

export type AIDifficulty = 'easy' | 'medium' | 'hard';

/** A seat at a match. `userId` is null for AI / open seats. */
export interface PlayerSlot {
  /** Index of the seat (0-based). Maps to engine-specific roles. */
  seat: number;
  /** The player id used inside the engine (stable per match). */
  playerId: string;
  userId: string | null;
  displayName: string;
  isAI: boolean;
  aiDifficulty?: AIDifficulty;
}

export type GameOutcome = 'WIN' | 'LOSS' | 'DRAW';

export interface GameResult {
  /** Engine playerId of the winner, or null for a draw. */
  winnerId: string | null;
  draw: boolean;
  /** Optional per-player score (game specific). */
  scores?: Record<string, number>;
  reason?: string;
}

export type RoomVisibility = 'PUBLIC' | 'PRIVATE';
export type RoomStatus = 'LOBBY' | 'IN_GAME' | 'FINISHED';
export type MemberRole = 'HOST' | 'PLAYER' | 'SPECTATOR';

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  level: number;
  xp: number;
  online: boolean;
}

export interface RoomMember {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: MemberRole;
  team: number | null;
  seat: number | null;
  ready: boolean;
  connected: boolean;
}

export interface RoomSummary {
  id: string;
  code: string;
  name: string;
  gameId: GameId;
  visibility: RoomVisibility;
  hasPassword: boolean;
  status: RoomStatus;
  hostUserId: string;
  memberCount: number;
  maxPlayers: number;
  spectatorCount: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  body: string;
  createdAt: string; // ISO
}

export interface LeaderboardRow {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
}

/** What a user is currently doing (live presence). */
export interface PresenceActivity {
  status: 'online' | 'in-lobby' | 'in-game';
  gameId?: string;
  gameName?: string;
  roomCode?: string;
}

export interface FriendSummary {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  level: number;
  online: boolean;
  activity: PresenceActivity | null;
}

export interface FriendRequestSummary {
  id: string;
  fromUserId: string;
  fromUsername: string;
  fromDisplayName: string;
  fromAvatarUrl: string | null;
  createdAt: string;
}

/** A live feed item — a friend started or finished a game. */
export interface FriendActivityItem {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  kind: 'result' | 'started';
  gameName: string;
  outcome?: GameOutcome;
  at: string; // ISO
}
