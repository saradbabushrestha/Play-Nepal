import type { MatchSnapshot } from '@play-nepal/shared';

export interface GameBoardProps {
  snapshot: MatchSnapshot;
  /** The signed-in user's engine playerId (their userId). */
  myPlayerId: string;
  onMove: (move: unknown) => void;
  pending: boolean;
}
