import type { BingoState } from '@play-nepal/shared';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { GameBoardProps } from './types';

const HEADERS = ['B', 'I', 'N', 'G', 'O'];

export function VirtualBingo({ snapshot, myPlayerId, onMove, pending }: GameBoardProps) {
  const state = snapshot.state as BingoState;
  const card = state.cards[myPlayerId] ?? [];
  const marked = state.marked[myPlayerId] ?? [];
  const called = new Set(state.callOrder.slice(0, state.callIndex));
  const isHost = state.players[0] === myPlayerId;
  const lastCalled = state.callIndex > 0 ? state.callOrder[state.callIndex - 1] : null;
  const over = state.winner !== null;

  return (
    <div className="mx-auto w-full max-w-sm space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
        <div>
          <div className="text-xs text-muted-foreground">Last called</div>
          <div className="text-3xl font-extrabold text-primary tabular-nums">{lastCalled ?? '—'}</div>
        </div>
        {isHost && !over && (
          <Button disabled={pending || state.callIndex >= 75} onClick={() => onMove({ type: 'call' })}>📣 Call next</Button>
        )}
        <div className="text-right text-xs text-muted-foreground">{state.callIndex} / 75 called</div>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {HEADERS.map((h) => (
          <div key={h} className="grid h-9 place-items-center rounded-lg bg-primary text-lg font-extrabold text-primary-foreground">{h}</div>
        ))}
        {card.map((num, i) => {
          const free = i === 12;
          const isMarked = marked[i];
          const canMark = !free && called.has(num) && !isMarked && !over;
          return (
            <button key={i} disabled={!canMark} onClick={() => onMove({ type: 'mark', cell: i })}
              className={cn('grid aspect-square place-items-center rounded-lg text-sm font-bold transition-colors',
                free ? 'bg-accent/30 text-accent' : isMarked ? 'bg-emerald-500 text-white' : called.has(num) ? 'bg-secondary ring-2 ring-primary/60 hover:bg-primary/20' : 'bg-card text-muted-foreground')}>
              {free ? '★' : num}
            </button>
          );
        })}
      </div>

      <Button className="w-full" variant="accent" disabled={pending || over} onClick={() => onMove({ type: 'bingo' })}>
        {over ? '🎉 BINGO!' : '🙌 Claim BINGO!'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {over ? `${state.names[state.players.indexOf(state.winner!)]} won!` : 'Mark called numbers · complete a line · claim BINGO'}
      </p>
    </div>
  );
}
