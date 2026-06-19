import type { AIDifficulty, GameMeta, GameResult, PlayerSlot } from '../types.js';

/**
 * Result of attempting to apply a move.
 * The engine is the single source of truth — the server runs it
 * authoritatively, the client may run it optimistically.
 */
export type MoveResult<S> =
  | { ok: true; state: S }
  | { ok: false; error: string };

/**
 * A pure, deterministic game engine.
 *
 * `S` = serializable game state, `M` = serializable move.
 * Every method is pure: no IO, no Date.now(), no randomness unless a
 * seed is threaded through the move/state. This lets the same code run
 * on the server (authoritative) and the client (prediction), and makes
 * matches fully replayable from their move log.
 */
export interface GameEngine<S = unknown, M = unknown> {
  readonly meta: GameMeta;

  /** Build the starting state for a set of seated players. */
  createInitialState(players: PlayerSlot[], options?: Record<string, unknown>): S;

  /** Validate + apply `move` made by `playerId`. Never mutates `state`. */
  applyMove(state: S, move: M, playerId: string): MoveResult<S>;

  /** All legal moves for `playerId` in `state` (used for validation + AI). */
  legalMoves(state: S, playerId: string): M[];

  /** The engine playerId whose turn it is, or null if finished/simultaneous. */
  currentTurn(state: S): string | null;

  /** Terminal result, or null if the game is still going. */
  getResult(state: S): GameResult | null;

  /** Optional AI: pick a move for `playerId`, or null if it can't. */
  aiMove?(state: S, playerId: string, difficulty: AIDifficulty): M | null;

  /**
   * Optional fog-of-war: return the slice of state a given viewer may see.
   * Hidden-information games (Mafia, card games) override this. Default is
   * full visibility.
   */
  viewFor?(state: S, viewerPlayerId: string | null): S;
}

/** Convenience helpers reused by concrete engines. */
export const ok = <S>(state: S): MoveResult<S> => ({ ok: true, state });
export const fail = <S>(error: string): MoveResult<S> => ({ ok: false, error });

/** Structured-clone helper so engines never mutate their inputs. */
export function clone<T>(value: T): T {
  return structuredClone(value);
}
