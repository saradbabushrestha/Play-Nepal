import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Medal, Users } from 'lucide-react';
import { GAME_CATALOG, type LeaderboardRow } from '@play-nepal/shared';
import { api, unwrap } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { Avatar, Badge, Button, Card, Spinner } from '@/components/ui';
import { cn } from '@/lib/utils';

const rankedGames = GAME_CATALOG.filter((g) => g.status === 'live' && g.ranked);
const tier = (rating: number) =>
  rating >= 1700 ? { label: 'Diamond', cls: 'text-cyan-300' }
  : rating >= 1500 ? { label: 'Platinum', cls: 'text-sky-300' }
  : rating >= 1300 ? { label: 'Gold', cls: 'text-amber-300' }
  : rating >= 1100 ? { label: 'Silver', cls: 'text-zinc-300' }
  : { label: 'Bronze', cls: 'text-orange-400' };

export function Leaderboard() {
  const me = useAuth((s) => s.user);
  const [scope, setScope] = useState<string>('global');
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);

  useEffect(() => {
    setRows(null);
    const params: Record<string, string> = {};
    if (scope !== 'global') params.gameId = scope;
    if (friendsOnly) params.friends = '1';
    api.get('/leaderboard', { params })
      .then((r) => setRows(unwrap<{ rows: LeaderboardRow[] }>(r.data).rows))
      .catch(() => setRows([]));
  }, [scope, friendsOnly]);

  const top3 = rows?.slice(0, 3) ?? [];
  const rest = rows?.slice(3) ?? [];
  const myRow = rows?.find((r) => r.userId === me?.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">🏆 Leaderboard</h1>
          <p className="text-muted-foreground">{friendsOnly ? 'Ranked among your friends.' : 'The best players across Play Nepal.'}</p>
        </div>
        {me && (
          <Button variant={friendsOnly ? 'default' : 'outline'} size="sm" onClick={() => setFriendsOnly((v) => !v)}>
            <Users className="h-4 w-4" /> Friends
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Tab active={scope === 'global'} onClick={() => setScope('global')}>Global</Tab>
        {rankedGames.map((g) => (
          <Tab key={g.id} active={scope === g.id} onClick={() => setScope(g.id)}>{g.name}</Tab>
        ))}
      </div>

      {rows === null ? (
        <div className="grid place-items-center py-16"><Spinner className="h-7 w-7" /></div>
      ) : rows.length === 0 ? (
        <Card className="py-16 text-center text-sm text-muted-foreground">
          {friendsOnly ? 'No ranked games among your friends yet.' : 'No ranked games played yet — be the first!'}
        </Card>
      ) : (
        <>
          {/* Podium */}
          {top3.length >= 1 && (
            <div className="grid grid-cols-3 items-end gap-3">
              {[top3[1], top3[0], top3[2]].map((row, i) =>
                row ? <Podium key={row.userId} row={row} place={i === 1 ? 1 : i === 0 ? 2 : 3} isMe={row.userId === me?.id} /> : <div key={i} />,
              )}
            </div>
          )}

          {/* The rest */}
          {rest.length > 0 && (
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {rest.map((row) => {
                    const t = tier(row.rating);
                    const isMe = row.userId === me?.id;
                    return (
                      <tr key={row.userId} className={cn('border-b border-border/50 last:border-0', isMe ? 'bg-primary/10' : 'hover:bg-secondary/40')}>
                        <td className="w-12 px-4 py-3 text-center font-bold text-muted-foreground">{row.rank}</td>
                        <td className="px-2 py-3">
                          <Link to={`/u/${row.username}`} className="flex items-center gap-2 font-medium hover:underline">
                            <Avatar name={row.displayName} src={row.avatarUrl} className="h-8 w-8" />
                            {row.displayName}{isMe && <Badge variant="accent">You</Badge>}
                          </Link>
                        </td>
                        <td className="hidden px-2 py-3 sm:table-cell"><span className={cn('text-xs font-semibold', t.cls)}>{t.label}</span></td>
                        <td className="px-4 py-3 text-right font-bold text-primary tabular-nums">{row.rating}</td>
                        <td className="hidden px-4 py-3 text-right text-muted-foreground sm:table-cell">{row.wins}/{row.losses}/{row.draws}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}

          {/* Your rank pinned, even if outside the visible list */}
          {me && !myRow && (
            <Card className="flex items-center gap-3 p-4 ring-1 ring-primary/40">
              <Avatar name={me.displayName} src={me.avatarUrl} className="h-9 w-9" />
              <span className="font-medium">{me.displayName} <Badge variant="accent">You</Badge></span>
              <span className="ml-auto text-sm text-muted-foreground">Play a ranked game to climb the board!</span>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function Podium({ row, place, isMe }: { row: LeaderboardRow; place: 1 | 2 | 3; isMe: boolean }) {
  const styles = {
    1: { h: 'h-40', ring: 'ring-yellow-400', icon: <Crown className="h-6 w-6 text-yellow-400" />, grad: 'from-yellow-400/20' },
    2: { h: 'h-32', ring: 'ring-slate-300', icon: <Medal className="h-5 w-5 text-slate-300" />, grad: 'from-slate-300/15' },
    3: { h: 'h-28', ring: 'ring-amber-600', icon: <Medal className="h-5 w-5 text-amber-600" />, grad: 'from-amber-600/15' },
  }[place];
  return (
    <div className="flex flex-col items-center">
      {styles.icon}
      <Link to={`/u/${row.username}`} className="mt-1 flex flex-col items-center hover:underline">
        <Avatar name={row.displayName} src={row.avatarUrl} className={cn('h-14 w-14 ring-2', styles.ring)} />
        <span className="mt-1 max-w-[6rem] truncate text-sm font-bold">{row.displayName}</span>
        {isMe && <Badge variant="accent">You</Badge>}
      </Link>
      <div className={cn('mt-2 grid w-full place-items-center rounded-t-xl bg-gradient-to-b to-transparent', styles.h, styles.grad)}>
        <div className="text-center">
          <div className="text-2xl font-extrabold text-primary tabular-nums">{row.rating}</div>
          <div className="text-xs text-muted-foreground">#{row.rank}</div>
        </div>
      </div>
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={cn('rounded-full px-4 py-1.5 text-sm font-medium transition-colors', active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground')}>
      {children}
    </button>
  );
}
