import type { GameMeta, GameResult, PlayerSlot } from '../types.js';
import { clone, fail, ok, type GameEngine, type MoveResult } from './engine.js';
import { seedFromOptions, shuffle } from './rng.js';

// ─────────────────────────────────────────────────────────────
// Shared engine for Mafia / Werewolf style social deduction.
// Roles: MAFIA (kill at night), DOCTOR (save), DETECTIVE (investigate),
// VILLAGER. Night → Day cycle; town lynches by vote. `viewFor` hides
// every secret (roles, night actions, investigation results).
// ─────────────────────────────────────────────────────────────

export type SDRole = 'MAFIA' | 'DOCTOR' | 'DETECTIVE' | 'VILLAGER' | 'HIDDEN';

export interface SDLabels {
  faction: string;
  protector: string;
  investigator: string;
  civilian: string;
}

export interface SocialDeductionState {
  phase: 'night' | 'day' | 'over';
  roles: Record<string, SDRole>;
  alive: Record<string, boolean>;
  players: string[];
  names: string[];
  nightActions: Record<string, string>; // actor -> target
  dayVotes: Record<string, string>;      // voter -> target
  lastDeaths: string[];
  detectiveResults: Record<string, Record<string, 'MAFIA' | 'NOT'>>;
  winner: 'MAFIA' | 'TOWN' | null;
  round: number;
  rng: number;
  labels: SDLabels;
}

export type SDMove = { type: 'night'; target: string } | { type: 'vote'; target: string };

const aliveList = (s: SocialDeductionState) => s.players.filter((p) => s.alive[p]);
const aliveWithRole = (s: SocialDeductionState, role: SDRole) => aliveList(s).filter((p) => s.roles[p] === role);

function checkWin(s: SocialDeductionState): void {
  const mafia = aliveWithRole(s, 'MAFIA').length;
  const others = aliveList(s).length - mafia;
  if (mafia === 0) { s.winner = 'TOWN'; s.phase = 'over'; }
  else if (mafia >= others) { s.winner = 'MAFIA'; s.phase = 'over'; }
}

/** Most-voted key in a tally; ties → null (no decision). */
function topVote(votes: Record<string, string>): string | null {
  const tally: Record<string, number> = {};
  for (const t of Object.values(votes)) tally[t] = (tally[t] ?? 0) + 1;
  let best: string | null = null, top = 0, tie = false;
  for (const [k, v] of Object.entries(tally)) {
    if (v > top) { top = v; best = k; tie = false; }
    else if (v === top) tie = true;
  }
  return tie ? null : best;
}

export function makeSocialDeduction(meta: GameMeta, labels: SDLabels): GameEngine<SocialDeductionState, SDMove> {
  return {
    meta,

    createInitialState(players: PlayerSlot[], options): SocialDeductionState {
      const seated = players.slice().sort((a, b) => a.seat - b.seat);
      const n = seated.length;
      const ids = seated.map((p) => p.playerId);
      const { result: order } = shuffle(ids, seedFromOptions(options));
      const roles: Record<string, SDRole> = {};
      const mafiaCount = Math.max(1, Math.floor(n / 4));
      let i = 0;
      for (; i < mafiaCount; i++) roles[order[i]!] = 'MAFIA';
      if (n >= 4) { roles[order[i++]!] = 'DOCTOR'; roles[order[i++]!] = 'DETECTIVE'; }
      for (; i < n; i++) roles[order[i]!] = 'VILLAGER';

      return {
        phase: 'night',
        roles,
        alive: Object.fromEntries(ids.map((p) => [p, true])),
        players: ids,
        names: seated.map((p) => p.displayName),
        nightActions: {},
        dayVotes: {},
        lastDeaths: [],
        detectiveResults: {},
        winner: null,
        round: 1,
        rng: seedFromOptions(options),
        labels,
      };
    },

    currentTurn() {
      return null; // simultaneous within each phase
    },

    legalMoves(state, playerId) {
      if (state.winner || !state.alive[playerId]) return [];
      const role = state.roles[playerId];
      if (state.phase === 'night') {
        if (state.nightActions[playerId]) return [];
        if (role === 'MAFIA') return aliveList(state).filter((p) => state.roles[p] !== 'MAFIA').map((target) => ({ type: 'night', target }));
        if (role === 'DOCTOR') return aliveList(state).map((target) => ({ type: 'night', target }));
        if (role === 'DETECTIVE') return aliveList(state).filter((p) => p !== playerId).map((target) => ({ type: 'night', target }));
        return []; // villagers sleep
      }
      if (state.phase === 'day') {
        if (state.dayVotes[playerId]) return [];
        return aliveList(state).filter((p) => p !== playerId).map((target) => ({ type: 'vote', target }));
      }
      return [];
    },

    applyMove(state, move, playerId): MoveResult<SocialDeductionState> {
      if (state.winner) return fail('Game over.');
      if (!state.alive[playerId]) return fail('You are out of the game.');
      const next = clone(state);

      if (move.type === 'night') {
        if (next.phase !== 'night') return fail('It is not night.');
        const role = next.roles[playerId];
        if (role !== 'MAFIA' && role !== 'DOCTOR' && role !== 'DETECTIVE') return fail('You have no night action.');
        if (next.nightActions[playerId]) return fail('You already acted.');
        if (!next.alive[move.target]) return fail('Target is not alive.');
        next.nightActions[playerId] = move.target;

        // Resolve once every alive night-role has acted.
        const actors = aliveList(next).filter((p) => ['MAFIA', 'DOCTOR', 'DETECTIVE'].includes(next.roles[p]!));
        if (actors.every((p) => next.nightActions[p])) {
          const mafiaVotes: Record<string, string> = {};
          for (const p of aliveWithRole(next, 'MAFIA')) mafiaVotes[p] = next.nightActions[p]!;
          const kill = topVote(mafiaVotes);
          const save = aliveWithRole(next, 'DOCTOR').map((d) => next.nightActions[d])[0] ?? null;
          next.lastDeaths = [];
          if (kill && kill !== save) { next.alive[kill] = false; next.lastDeaths.push(kill); }
          for (const det of aliveWithRole(next, 'DETECTIVE')) {
            const t = next.nightActions[det]!;
            (next.detectiveResults[det] ??= {})[t] = next.roles[t] === 'MAFIA' ? 'MAFIA' : 'NOT';
          }
          next.nightActions = {};
          next.phase = 'day';
          checkWin(next);
        }
        return ok(next);
      }

      // vote
      if (next.phase !== 'day') return fail('It is not the day vote.');
      if (next.dayVotes[playerId]) return fail('You already voted.');
      if (!next.alive[move.target] || move.target === playerId) return fail('Invalid vote.');
      next.dayVotes[playerId] = move.target;
      if (aliveList(next).every((p) => next.dayVotes[p])) {
        const lynched = topVote(next.dayVotes);
        next.lastDeaths = [];
        if (lynched) { next.alive[lynched] = false; next.lastDeaths.push(lynched); }
        next.dayVotes = {};
        next.phase = 'night';
        next.round += 1;
        checkWin(next);
      }
      return ok(next);
    },

    getResult(state): GameResult | null {
      if (!state.winner) return null;
      // Winners are everyone on the winning side; report the faction.
      return {
        winnerId: null,
        draw: false,
        reason: state.winner === 'MAFIA' ? `${state.labels.faction} win!` : 'Town wins!',
        scores: { round: state.round },
      };
    },

    // Hide all secret information from the viewer.
    viewFor(state, viewer) {
      const v = clone(state);
      const viewerRole = viewer ? state.roles[viewer] : 'HIDDEN';
      v.roles = Object.fromEntries(state.players.map((p) => {
        const reveal =
          !state.alive[p] ||                                  // dead roles are public
          state.winner !== null ||                            // all revealed at game end
          p === viewer ||                                     // your own role
          (viewerRole === 'MAFIA' && state.roles[p] === 'MAFIA'); // mafia know each other
        return [p, reveal ? state.roles[p]! : 'HIDDEN'];
      }));
      // Night actions are secret; only the count of who has acted is implied.
      v.nightActions = {};
      // Only the detective sees their own investigation results.
      v.detectiveResults = viewer && state.detectiveResults[viewer] ? { [viewer]: state.detectiveResults[viewer]! } : {};
      return v;
    },
  };
}
