import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Bot, Sparkles, Swords, Trophy, Users } from 'lucide-react';
import { GAME_CATALOG, CATEGORY_LABELS } from '@play-nepal/shared';
import { Badge, buttonVariants, Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/auth';

const featured = GAME_CATALOG.filter((g) => g.status === 'live').slice(0, 6);
const liveCount = GAME_CATALOG.filter((g) => g.status === 'live').length;

export function Landing() {
  const authed = useAuth((s) => s.status === 'authenticated');

  return (
    <div className="space-y-20">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-background to-accent/10 px-6 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl space-y-6"
        >
          <Badge variant="accent" className="mx-auto">
            <Sparkles className="mr-1 h-3 w-3" /> Nepal’s multiplayer arena
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
            Play <span className="text-gradient">Baghchal</span>, party games & {GAME_CATALOG.length}+ more —
            <br className="hidden sm:block" /> together, in real time.
          </h1>
          <p className="text-lg text-muted-foreground">
            Create a room, share the code, and battle friends or AI across traditional Nepali games,
            board classics, office team-builders and quizzes.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to={authed ? '/lobby' : '/register'} className={cn(buttonVariants({ size: 'lg' }))}>
              {authed ? 'Enter the lobby' : 'Start playing free'} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/leaderboard" className={cn(buttonVariants({ size: 'lg', variant: 'outline' }))}>
              View leaderboard
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat icon={<Swords className="h-5 w-5" />} value={`${liveCount} live`} label="Playable games right now" />
        <Stat icon={<Bot className="h-5 w-5" />} value="AI opponents" label="Practice anytime, any level" />
        <Stat icon={<Trophy className="h-5 w-5" />} value="ELO ranked" label="Climb global leaderboards" />
      </section>

      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold">Featured games</h2>
            <p className="text-muted-foreground">Hand-picked, fully playable today.</p>
          </div>
          <Link to="/lobby" className="text-sm font-semibold text-primary hover:underline">Browse all →</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((game, i) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="group h-full overflow-hidden p-5 transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10">
                <div className="flex items-start justify-between">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-2xl">
                    {emojiFor(game.id)}
                  </div>
                  <Badge variant="muted">{CATEGORY_LABELS[game.category]}</Badge>
                </div>
                <h3 className="mt-4 text-lg font-bold">{game.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{game.shortDescription}</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" /> {game.minPlayers}–{game.maxPlayers} players
                  {game.supportsAI && <Badge variant="success">AI</Badge>}
                  {game.ranked && <Badge variant="accent">Ranked</Badge>}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">{icon}</div>
      <div>
        <div className="font-bold">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </Card>
  );
}

export function emojiFor(id: string): string {
  const map: Record<string, string> = {
    baghchal: '🐯',
    'tic-tac-toe': '⭕',
    'connect-4': '🔴',
    chess: '♟️',
    checkers: '⚫',
    reversi: '⬛',
    gomoku: '⚪',
    'dots-and-boxes': '🔲',
    ludo: '🎲',
    'snakes-ladders': '🐍',
    '2048': '🔢',
    'memory-match': '🃏',
    'math-challenge': '➗',
    minesweeper: '💣',
    sudoku: '🔢',
    'number-puzzle': '🧩',
    'memory-challenge': '🧠',
    'reaction-speed': '⚡',
    'spin-the-wheel': '🎡',
    'would-you-rather': '🤔',
    'word-search': '🔤',
    'click-speed': '🖱️',
    'coding-quiz': '💻',
    'geography-challenge': '🌍',
    'vocabulary-battle': '📖',
    'guess-the-movie': '🎬',
    'guess-the-song': '🎵',
    'iq-puzzle': '🧩',
    'rapid-fire': '⚡',
    'team-quiz': '🏆',
    'truth-or-dare': '🎭',
    icebreaker: '❄️',
    'most-likely-to': '🗳️',
    'typing-race': '⌨️',
    'virtual-bingo': '🎱',
    werewolf: '🐺',
    charades: '🎭',
    'heads-up': '🙈',
    'meme-battle': '😂',
    'guess-the-employee': '🔍',
    gatti: '🪨',
    'draw-and-guess': '🎨',
    carrom: '⚪',
    'langur-burja': '🎴',
    mafia: '🕵️',
    'nepali-quiz': '🧠',
  };
  return map[id] ?? '🎮';
}
