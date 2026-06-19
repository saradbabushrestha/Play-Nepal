import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, UserPlus, UserX, X } from 'lucide-react';
import type { FriendActivityItem, FriendSummary } from '@play-nepal/shared';
import { useFriends } from '@/store/friends';
import { apiError } from '@/lib/api';
import { Avatar, Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Spinner } from '@/components/ui';
import { timeAgo } from '@/lib/utils';

function activityLabel(f: FriendSummary): { text: string; tone: string } {
  if (!f.online) return { text: 'Offline', tone: 'text-muted-foreground' };
  const a = f.activity;
  if (a?.status === 'in-game') return { text: `Playing ${a.gameName ?? 'a game'}`, tone: 'text-emerald-400' };
  if (a?.status === 'in-lobby') return { text: `In a ${a.gameName ?? 'game'} room`, tone: 'text-amber-400' };
  return { text: 'Online', tone: 'text-emerald-400' };
}

function feedText(item: FriendActivityItem): string {
  if (item.kind === 'started') return `started ${item.gameName}`;
  if (item.outcome === 'WIN') return `won at ${item.gameName} 🏆`;
  if (item.outcome === 'LOSS') return `lost at ${item.gameName}`;
  return `drew at ${item.gameName}`;
}

export function Friends() {
  const { friends, requests, feed, loaded, load, subscribe, sendRequest, accept, decline, remove } = useFriends();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { void load(); subscribe(); }, [load, subscribe]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setBusy(true); setMsg('');
    try {
      const accepted = await sendRequest(username.trim());
      setMsg(accepted ? '🎉 You’re now friends!' : '✅ Request sent.');
      setUsername('');
    } catch (err) { setMsg(apiError(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">👥 Friends</h1>
        <p className="text-muted-foreground">See who’s online, what they’re playing, and their results live.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Add friend */}
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={add} className="flex gap-2">
                <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Add a friend by username…" />
                <Button type="submit" loading={busy}><UserPlus className="h-4 w-4" /> Add</Button>
              </form>
              {msg && <p className="mt-2 text-sm text-muted-foreground">{msg}</p>}
            </CardContent>
          </Card>

          {/* Pending requests */}
          {requests.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Friend requests ({requests.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {requests.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-2">
                    <Link to={`/u/${r.fromUsername}`} className="flex items-center gap-2 hover:underline">
                      <Avatar name={r.fromDisplayName} src={r.fromAvatarUrl} className="h-9 w-9" />
                      <span className="font-medium">{r.fromDisplayName}</span>
                      <span className="text-sm text-muted-foreground">@{r.fromUsername}</span>
                    </Link>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => void accept(r.id)}><Check className="h-4 w-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => void decline(r.id)}><X className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Friends list */}
          <Card>
            <CardHeader><CardTitle>Your friends ({friends.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {!loaded ? <Spinner /> : friends.length === 0 ? (
                <p className="text-sm text-muted-foreground">No friends yet — add someone by their username above.</p>
              ) : friends.map((f) => {
                const act = activityLabel(f);
                return (
                  <div key={f.id} className="flex items-center justify-between gap-2 rounded-lg p-2 hover:bg-secondary/40">
                    <Link to={`/u/${f.username}`} className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar name={f.displayName} src={f.avatarUrl} className="h-10 w-10" />
                        <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${f.online ? 'bg-emerald-500' : 'bg-zinc-500'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 font-semibold">{f.displayName} <Badge variant="muted">Lv {f.level}</Badge></div>
                        <div className={`text-xs ${act.tone}`}>{act.text}</div>
                      </div>
                    </Link>
                    <div className="flex gap-1">
                      {f.activity?.roomCode && f.online && (
                        <Button size="sm" onClick={() => navigate(`/room/${f.activity!.roomCode}`)}>Join</Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => void remove(f.id)} aria-label="Remove friend"><UserX className="h-4 w-4" /></Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Live activity feed */}
        <Card className="h-fit">
          <CardHeader><CardTitle>Live activity</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {feed.length === 0 ? (
              <p className="text-sm text-muted-foreground">Friend results will appear here in real time.</p>
            ) : feed.map((item, i) => (
              <motion.div key={`${item.userId}-${item.at}-${i}`} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 text-sm">
                <Avatar name={item.displayName} src={item.avatarUrl} className="h-7 w-7" />
                <span><b>{item.displayName}</b> {feedText(item)}</span>
                <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">{timeAgo(item.at)}</span>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
