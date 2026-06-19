import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Crown, LogOut, Send, UserX } from 'lucide-react';
import type {
  ChatMessage,
  GameResult,
  MatchReward,
  MatchSnapshot,
  RoomStateSnapshot,
} from '@play-nepal/shared';
import { GAME_CATALOG } from '@play-nepal/shared';
import { connectSocket, emitAck, getSocket } from '@/lib/socket';
import { useAuth } from '@/store/auth';
import { Avatar, Badge, Button, Card, Input, Spinner } from '@/components/ui';
import { cn } from '@/lib/utils';
import { GameView } from '@/games/GameView';
import { ResultModal } from '@/components/game/ResultModal';
import { emojiFor } from '@/pages/Landing';

const REACTIONS = ['👍', '🔥', '😂', '😮', '🎉', '😭'];

export function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user)!;

  const [room, setRoom] = useState<RoomStateSnapshot | null>(null);
  const [match, setMatch] = useState<MatchSnapshot | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [result, setResult] = useState<GameResult | null>(null);
  const [reward, setReward] = useState<MatchReward | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [floats, setFloats] = useState<Array<{ id: number; emoji: string }>>([]);

  // ── Socket lifecycle ──
  useEffect(() => {
    if (!code) return;
    const socket = connectSocket();
    let active = true;

    const join = async () => {
      try {
        const snap = await emitAck<RoomStateSnapshot>('room:join', { code });
        if (!active) return;
        setRoom(snap);
        setMessages(snap.messages);
        setMatch(snap.match);
        setResult(snap.match?.result ?? null);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not join room');
      }
    };

    // Join now, and re-join automatically on every (re)connect so a brief
    // network drop or HMR reload doesn't evict us from the room.
    const onConnect = () => void join();
    if (socket.connected) void join();
    socket.on('connect', onConnect);

    // Don't take the match from room:state — that's a public (viewFor null)
    // broadcast and would clobber a player's personalised view in hidden-info
    // games. Match state comes from the join ack + game:started/update/over.
    const onState = (s: RoomStateSnapshot) => { setRoom(s); setMessages(s.messages); };
    const onChat = (m: ChatMessage) => setMessages((prev) => [...prev, m]);
    const onStarted = (s: MatchSnapshot) => { setMatch(s); setResult(null); setReward(null); setShowResult(false); };
    const onUpdate = (s: MatchSnapshot) => setMatch(s);
    const onOver = (p: { result: GameResult; snapshot: MatchSnapshot; reward?: MatchReward | null }) => {
      setMatch(p.snapshot); setResult(p.result); setReward(p.reward ?? null); setShowResult(true);
    };
    const onReact = (p: { emoji: string }) => {
      const id = Math.random();
      setFloats((f) => [...f, { id, emoji: p.emoji }]);
      setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 2000);
    };
    const onKicked = () => { setError('You were removed from this room.'); setTimeout(() => navigate('/lobby'), 1500); };
    const onErr = (p: { message: string }) => setError(p.message);

    socket.on('room:state', onState);
    socket.on('room:chat', onChat);
    socket.on('game:started', onStarted);
    socket.on('game:update', onUpdate);
    socket.on('game:over', onOver);
    socket.on('room:react', onReact);
    socket.on('room:kicked', onKicked);
    socket.on('error', onErr);

    return () => {
      active = false;
      const s = getSocket();
      if (room?.room.id) void emitAck('room:leave', { roomId: room.room.id }).catch(() => {});
      s.off('connect', onConnect);
      s.off('room:state', onState);
      s.off('room:chat', onChat);
      s.off('game:started', onStarted);
      s.off('game:update', onUpdate);
      s.off('game:over', onOver);
      s.off('room:react', onReact);
      s.off('room:kicked', onKicked);
      s.off('error', onErr);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const onMove = useCallback(
    (move: unknown) => {
      if (!match) return;
      setPending(true);
      setError('');
      emitAck<MatchSnapshot>('game:move', { matchId: match.matchId, move })
        .then(setMatch)
        .catch((err) => setError(err instanceof Error ? err.message : 'Illegal move'))
        .finally(() => setPending(false));
    },
    [match],
  );

  if (error && !room) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg font-semibold">{error}</p>
        <Button className="mt-4" onClick={() => navigate('/lobby')}>Back to lobby</Button>
      </div>
    );
  }
  if (!room) return <div className="grid place-items-center py-20"><Spinner className="h-7 w-7" /></div>;

  const isHost = room.room.hostUserId === user.id;
  const gameMeta = GAME_CATALOG.find((g) => g.id === room.room.gameId);
  const inGame = match && !result;
  const iWon = !!result && !result.draw && result.winnerId === user.id;

  const startGame = async () => {
    try {
      await emitAck('room:start', { roomId: room.room.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start');
    }
  };

  const copyCode = () => {
    void navigator.clipboard.writeText(room.room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const winnerName = result?.winnerId
    ? match?.seats.find((s) => s.playerId === result.winnerId)?.displayName ?? 'Winner'
    : null;

  return (
    <div className="space-y-4">
      {showResult && result && (
        <ResultModal
          result={result}
          reward={reward}
          iWon={iWon}
          winnerName={winnerName}
          isHost={isHost}
          onPlayAgain={() => { setShowResult(false); void startGame(); }}
          onClose={() => setShowResult(false)}
        />
      )}
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{emojiFor(room.room.gameId)}</span>
          <div>
            <h1 className="text-xl font-bold">{room.room.name}</h1>
            <p className="text-sm text-muted-foreground">{gameMeta?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copyCode} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-mono font-bold tracking-widest hover:bg-secondary">
            {room.room.code}
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          </button>
          <Button variant="outline" size="sm" onClick={() => navigate('/lobby')}><LogOut className="h-4 w-4" /> Leave</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Main stage */}
        <Card className="relative min-h-[420px] p-6">
          <AnimatePresence>
            {floats.map((f) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 20, scale: 0.5 }}
                animate={{ opacity: 1, y: -40, scale: 1.4 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute left-1/2 top-1/2 text-4xl"
              >
                {f.emoji}
              </motion.div>
            ))}
          </AnimatePresence>

          {inGame && match ? (
            <div className="space-y-4">
              <TurnBar match={match} myId={user.id} />
              <GameView gameId={room.room.gameId} snapshot={match} myPlayerId={user.id} onMove={onMove} pending={pending} />
              <div className="flex items-center justify-center gap-2">
                {REACTIONS.map((e) => (
                  <button key={e} onClick={() => getSocket().emit('room:react', { roomId: room.room.id, emoji: e })} className="rounded-lg px-2 py-1 text-xl transition-transform hover:scale-125">
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <LobbyStage room={room} isHost={isHost} onStart={startGame} result={result} match={match} myId={user.id} />
          )}
        </Card>

        {/* Sidebar: members + chat */}
        <div className="flex flex-col gap-4">
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-bold uppercase text-muted-foreground">Players ({room.members.length})</h3>
            <div className="space-y-2">
              {room.members.map((m) => (
                <div key={m.userId} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Avatar name={m.displayName} src={m.avatarUrl} className="h-8 w-8" />
                    <div>
                      <div className="flex items-center gap-1 text-sm font-medium">
                        {m.displayName}
                        {m.role === 'HOST' && <Crown className="h-3 w-3 text-yellow-400" />}
                      </div>
                      <div className="text-xs text-muted-foreground">{m.role === 'SPECTATOR' ? 'Spectator' : `Seat ${(m.seat ?? 0) + 1}`}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {m.role !== 'SPECTATOR' && <Badge variant={m.ready ? 'success' : 'muted'}>{m.ready ? 'Ready' : 'Idle'}</Badge>}
                    {isHost && m.userId !== user.id && (
                      <button onClick={() => emitAck('room:kick', { roomId: room.room.id, userId: m.userId })} className="text-muted-foreground hover:text-destructive">
                        <UserX className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <ChatPanel
            messages={messages}
            onSend={(body) => emitAck('room:chat', { roomId: room.room.id, body }).catch(() => {})}
          />
        </div>
      </div>
    </div>
  );
}

function TurnBar({ match, myId }: { match: MatchSnapshot; myId: string }) {
  const turnSeat = match.seats.find((s) => s.playerId === match.turn);
  const myTurn = match.turn === myId;
  return (
    <div className={cn('rounded-lg px-4 py-2 text-center text-sm font-semibold', myTurn ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground')}>
      {myTurn ? '🟢 Your turn' : turnSeat ? `Waiting for ${turnSeat.displayName}…` : 'Game in progress'}
    </div>
  );
}

function LobbyStage({
  room,
  isHost,
  onStart,
  result,
  match,
  myId,
}: {
  room: RoomStateSnapshot;
  isHost: boolean;
  onStart: () => void;
  result: GameResult | null;
  match: MatchSnapshot | null;
  myId: string;
}) {
  const players = room.members.filter((m) => m.role !== 'SPECTATOR');
  const iWon = result && !result.draw && result.winnerId === myId;
  const winnerName = result?.winnerId
    ? match?.seats.find((s) => s.playerId === result.winnerId)?.displayName ?? 'Winner'
    : null;

  return (
    <div className="grid h-full place-items-center py-10 text-center">
      <div className="space-y-4">
        {result ? (
          <>
            <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}
              className="text-6xl">{result.draw ? '🤝' : iWon ? '🏆' : '😔'}</motion.div>
            <div>
              <h2 className="text-3xl font-extrabold">
                {result.draw ? "It's a draw!" : iWon ? 'Victory! 🎉' : 'Defeat'}
              </h2>
              <p className="mt-1 text-muted-foreground">
                {result.draw ? result.reason : `${winnerName} wins — ${result.reason}`}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="text-5xl">🎮</div>
            <h2 className="text-2xl font-bold">Waiting room</h2>
            <p className="text-muted-foreground">
              {players.length} player{players.length === 1 ? '' : 's'} ready · share code <b className="font-mono tracking-widest">{room.room.code}</b>
            </p>
          </>
        )}
        {isHost ? (
          <Button size="lg" className="animate-win-glow" onClick={onStart}>{result ? '↺ Play again' : '▶ Start game'}</Button>
        ) : (
          <p className="text-sm text-muted-foreground">Waiting for the host to {result ? 'restart' : 'start'}…</p>
        )}
      </div>
    </div>
  );
}

function ChatPanel({ messages, onSend }: { messages: ChatMessage[]; onSend: (body: string) => void }) {
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

  return (
    <Card className="flex h-72 flex-col p-3">
      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {messages.length === 0 && <p className="text-center text-xs text-muted-foreground">Say hi 👋</p>}
        {messages.map((m) => (
          <div key={m.id} className="text-sm">
            <span className="font-semibold text-primary">{m.username}</span>{' '}
            <span className="text-foreground/90">{m.body}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) { onSend(text.trim()); setText(''); }
        }}
      >
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message…" maxLength={500} />
        <Button type="submit" size="icon"><Send className="h-4 w-4" /></Button>
      </form>
    </Card>
  );
}
