import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, Lock, Plus, Users } from 'lucide-react';
import { CATEGORY_LABELS, GAME_CATALOG, isLiveGame, type GameMeta, type RoomSummary } from '@play-nepal/shared';
import { api, apiError, unwrap } from '@/lib/api';
import { Badge, Button, Card, Input, Spinner } from '@/components/ui';
import { cn } from '@/lib/utils';
import { emojiFor } from '@/pages/Landing';

const categories = ['ALL', ...Object.keys(CATEGORY_LABELS)] as const;

export function Lobby() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<(typeof categories)[number]>('ALL');
  const [joinCode, setJoinCode] = useState('');
  const [rooms, setRooms] = useState<RoomSummary[] | null>(null);
  const [createFor, setCreateFor] = useState<GameMeta | null>(null);

  useEffect(() => {
    api.get('/rooms').then((r) => setRooms(unwrap<{ rooms: RoomSummary[] }>(r.data).rooms)).catch(() => setRooms([]));
  }, []);

  const games = useMemo(
    () => GAME_CATALOG.filter((g) => filter === 'ALL' || g.category === filter),
    [filter],
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">Game Lobby</h1>
          <p className="text-muted-foreground">Pick a game, create a room, invite your friends.</p>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (joinCode.trim()) navigate(`/room/${joinCode.trim().toUpperCase()}`);
          }}
        >
          <Input
            placeholder="Enter room code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            className="w-40 uppercase tracking-widest"
            maxLength={6}
          />
          <Button type="submit" variant="accent">Join</Button>
        </form>
      </div>

      {/* Public rooms */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold">Open public rooms</h2>
        {rooms === null ? (
          <Spinner />
        ) : rooms.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No public rooms yet — be the first to create one below!
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <Card key={room.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{emojiFor(room.gameId)}</span>
                    <span className="truncate font-semibold">{room.name}</span>
                    {room.hasPassword && <Lock className="h-3 w-3 text-muted-foreground" />}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" /> {room.memberCount}/{room.maxPlayers}
                    <Badge variant={room.status === 'LOBBY' ? 'success' : 'muted'}>{room.status}</Badge>
                  </div>
                </div>
                <Button size="sm" onClick={() => navigate(`/room/${room.code}`)}>Join</Button>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Game catalogue */}
      <section className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                filter === c ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground',
              )}
            >
              {c === 'ALL' ? 'All' : CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS]}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => {
            const live = isLiveGame(game.id);
            return (
              <motion.div key={game.id} layout>
                <Card className={cn('flex h-full flex-col p-5', live ? 'hover:border-primary/50' : 'opacity-70')}>
                  <div className="flex items-start justify-between">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-2xl">{emojiFor(game.id)}</div>
                    {live ? <Badge variant="success">Live</Badge> : <Badge variant="muted">Soon</Badge>}
                  </div>
                  <h3 className="mt-3 font-bold">{game.name}</h3>
                  <p className="mt-1 flex-1 text-sm text-muted-foreground">{game.shortDescription}</p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" /> {game.minPlayers}–{game.maxPlayers}
                    {game.supportsAI && <Bot className="h-3 w-3" />}
                  </div>
                  <Button
                    className="mt-4"
                    disabled={!live}
                    variant={live ? 'default' : 'secondary'}
                    onClick={() => setCreateFor(game)}
                  >
                    <Plus className="h-4 w-4" /> {live ? 'Create room' : 'Coming soon'}
                  </Button>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      {createFor && <CreateRoomModal game={createFor} onClose={() => setCreateFor(null)} />}
    </div>
  );
}

function CreateRoomModal({ game, onClose }: { game: GameMeta; onClose: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState(`${game.name} room`);
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [password, setPassword] = useState('');
  const [vsAI, setVsAI] = useState(game.supportsAI);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function create() {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/rooms', {
        name,
        gameId: game.id,
        visibility,
        password: password || undefined,
        maxPlayers: game.maxPlayers,
      });
      const { room } = unwrap<{ room: RoomSummary }>(res.data);
      navigate(`/room/${room.code}`, { state: { vsAI } });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={(e) => e.stopPropagation()}>
        <Card className="w-full max-w-md p-6">
          <h3 className="text-xl font-bold">Create {game.name} room</h3>
          <div className="mt-4 space-y-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Room name" />
            <div className="flex gap-2">
              {(['PUBLIC', 'PRIVATE'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setVisibility(v)}
                  className={cn(
                    'flex-1 rounded-lg border py-2 text-sm font-medium',
                    visibility === v ? 'border-primary bg-primary/10' : 'border-border',
                  )}
                >
                  {v === 'PUBLIC' ? 'Public' : 'Private'}
                </button>
              ))}
            </div>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (optional)"
            />
            {game.supportsAI && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={vsAI} onChange={(e) => setVsAI(e.target.checked)} />
                Fill empty seats with an AI opponent
              </label>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button className="flex-1" onClick={create} loading={loading}>Create & enter</Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
