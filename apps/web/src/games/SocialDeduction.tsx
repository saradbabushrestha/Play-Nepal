import { useEffect, useState } from 'react';
import type { SocialDeductionState, SDRole } from '@play-nepal/shared';
import { Avatar, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

const ROLE_STYLE: Record<SDRole, string> = {
  MAFIA: 'text-red-400', DOCTOR: 'text-emerald-400', DETECTIVE: 'text-blue-400', VILLAGER: 'text-zinc-300', HIDDEN: 'text-muted-foreground',
};

export function SocialDeduction({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as SocialDeductionState;
  const L = state.labels;
  const myRole = state.roles[myPlayerId] ?? 'HIDDEN';
  const alive = state.alive[myPlayerId];
  const idx = state.players.indexOf(myPlayerId);

  const [actedNight, setActedNight] = useState(false);
  useEffect(() => setActedNight(false), [state.round, state.phase]);

  const label = (r: SDRole) =>
    r === 'MAFIA' ? L.faction : r === 'DOCTOR' ? L.protector : r === 'DETECTIVE' ? L.investigator : r === 'VILLAGER' ? L.civilian : 'Unknown';

  const aliveIds = state.players.filter((p) => state.alive[p]);
  const votedDay = !!state.dayVotes[myPlayerId];

  // Who can I target right now?
  const nightTargets = () => {
    if (myRole === 'MAFIA') return aliveIds.filter((p) => state.roles[p] !== 'MAFIA');
    if (myRole === 'DOCTOR') return aliveIds;
    if (myRole === 'DETECTIVE') return aliveIds.filter((p) => p !== myPlayerId);
    return [];
  };
  const canActNight = state.phase === 'night' && alive && !actedNight && ['MAFIA', 'DOCTOR', 'DETECTIVE'].includes(myRole);
  const canVoteDay = state.phase === 'day' && alive && !votedDay;

  const act = (target: string) => {
    if (pending) return;
    if (canActNight) { onMove({ type: 'night', target }); setActedNight(true); }
    else if (canVoteDay) onMove({ type: 'vote', target });
  };
  const selectable = (p: string) =>
    p !== myPlayerId &&
    ((canActNight && nightTargets().includes(p)) || (canVoteDay && p !== myPlayerId)) ||
    (canActNight && myRole === 'DOCTOR' && p === myPlayerId); // doctor may self-save

  const detResults = state.detectiveResults[myPlayerId] ?? {};
  const nightAction = myRole === 'MAFIA' ? `Choose who to eliminate` : myRole === 'DOCTOR' ? 'Choose who to protect' : myRole === 'DETECTIVE' ? 'Choose who to investigate' : 'Sleep tight…';

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant={state.phase === 'night' ? 'accent' : 'default'}>{state.phase === 'night' ? '🌙 Night' : state.phase === 'day' ? '☀️ Day' : '🏁 Over'} · Round {state.round}</Badge>
        <span className="text-sm text-muted-foreground">You are <b className={ROLE_STYLE[myRole]}>{label(myRole)}</b>{!alive && ' 💀'}</span>
      </div>

      {state.lastDeaths.length > 0 && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm text-red-300">
          💀 {state.lastDeaths.map((p) => state.names[state.players.indexOf(p)]).join(', ')} {state.lastDeaths.length === 1 ? 'was' : 'were'} taken out.
        </p>
      )}

      <div className="rounded-lg bg-secondary/40 p-3 text-center text-sm font-semibold">
        {!alive ? 'You are out — watch how it unfolds.' : canActNight ? nightAction : canVoteDay ? 'Vote to eliminate a suspect' : state.phase === 'night' ? '🌙 Waiting for the night to end…' : '☀️ Waiting for votes…'}
      </div>

      <div className="space-y-2">
        {state.players.map((p, i) => {
          const r = state.roles[p];
          const dead = !state.alive[p];
          const dayVotesFor = Object.values(state.dayVotes).filter((t) => t === p).length;
          return (
            <button key={p} disabled={!selectable(p)} onClick={() => act(p)}
              className={cn('flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors',
                dead ? 'border-border opacity-50' : selectable(p) ? 'border-border hover:border-primary hover:bg-secondary' : 'border-border')}>
              <Avatar name={state.names[i]!} className="h-9 w-9" />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-semibold">
                  {state.names[i]}{p === myPlayerId && ' (you)'}
                  {dead && <span className="text-xs text-red-400">💀 {label(r!)}</span>}
                  {!dead && r !== 'HIDDEN' && p !== myPlayerId && <span className={cn('text-xs', ROLE_STYLE[r!])}>{label(r!)}</span>}
                  {detResults[p] && <Badge variant={detResults[p] === 'MAFIA' ? 'accent' : 'muted'}>{detResults[p] === 'MAFIA' ? `🔍 ${L.faction}` : '🔍 clean'}</Badge>}
                </div>
              </div>
              {state.phase === 'day' && dayVotesFor > 0 && <Badge variant="muted">{dayVotesFor} 🗳️</Badge>}
            </button>
          );
        })}
      </div>
      {idx < 0 && <p className="text-center text-sm text-muted-foreground">Spectating</p>}
    </div>
  );
}
