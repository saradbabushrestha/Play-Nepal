import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Flame, Gamepad2, Trophy } from 'lucide-react';
import { api, unwrap } from '@/lib/api';
import { Avatar, Badge, Card, CardContent, CardHeader, CardTitle, Spinner } from '@/components/ui';
import { xpForNextLevel } from '@/lib/utils';

interface ProfileData {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  level: number;
  xp: number;
  country: string | null;
  city: string | null;
  isOnline: boolean;
  profile: { totalWins: number; totalLosses: number; totalDraws: number; gamesPlayed: number; bestStreak: number; bio: string | null } | null;
  ratings: Array<{ gameId: string; rating: number; wins: number; losses: number; game: { name: string } }>;
  achievements: Array<{ achievement: { id: string; name: string; description: string } }>;
}

export function Profile() {
  const { username } = useParams();
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    api
      .get(`/users/${username}`)
      .then((r) => setData(unwrap<{ user: ProfileData }>(r.data).user))
      .catch(() => setError('User not found.'));
  }, [username]);

  if (error) return <p className="py-20 text-center text-muted-foreground">{error}</p>;
  if (!data) return <div className="grid place-items-center py-20"><Spinner className="h-7 w-7" /></div>;

  const p = data.profile;
  const nextLevelXp = xpForNextLevel(data.level);
  const pct = Math.min(100, Math.round((data.xp / nextLevelXp) * 100));

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary/30 to-accent/30" />
        <CardContent className="-mt-10 flex flex-col items-center gap-3 pb-6 text-center sm:flex-row sm:items-end sm:text-left">
          <Avatar name={data.displayName} src={data.avatarUrl} className="h-24 w-24 border-4 border-card text-2xl" />
          <div className="flex-1">
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-2xl font-extrabold">{data.displayName}</h1>
              {data.isOnline && <Badge variant="success">online</Badge>}
            </div>
            <p className="text-muted-foreground">@{data.username}{data.city ? ` · ${data.city}` : ''}</p>
          </div>
          <div className="w-full sm:w-56">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Level {data.level}</span>
              <span>{data.xp} / {nextLevelXp} XP</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard icon={<Trophy className="h-4 w-4" />} label="Wins" value={p?.totalWins ?? 0} />
        <StatCard icon={<Gamepad2 className="h-4 w-4" />} label="Games" value={p?.gamesPlayed ?? 0} />
        <StatCard icon={<Flame className="h-4 w-4" />} label="Best streak" value={p?.bestStreak ?? 0} />
        <StatCard icon={<Trophy className="h-4 w-4" />} label="Losses" value={p?.totalLosses ?? 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Game ratings</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.ratings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No ranked games yet.</p>
            ) : (
              data.ratings.map((r) => (
                <div key={r.gameId} className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2">
                  <span className="font-medium">{r.game.name}</span>
                  <span className="font-bold text-primary">{r.rating}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Achievements</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {data.achievements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No badges unlocked yet.</p>
            ) : (
              data.achievements.map((a) => (
                <Badge key={a.achievement.id} variant="accent" className="px-3 py-1" title={a.achievement.description}>
                  🏅 {a.achievement.name}
                </Badge>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </Card>
  );
}
