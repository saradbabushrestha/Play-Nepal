import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { GameResult, MatchReward } from '@play-nepal/shared';
import { Button } from '@/components/ui';
import { Confetti } from '@/components/game/Confetti';
import { cn } from '@/lib/utils';

const levelThreshold = (lvl: number) => (lvl - 1) * (lvl - 1) * 100;

export function ResultModal({
  result, reward, iWon, winnerName, isHost, onPlayAgain, onClose,
}: {
  result: GameResult;
  reward: MatchReward | null;
  iWon: boolean;
  winnerName: string | null;
  isHost: boolean;
  onPlayAgain: () => void;
  onClose: () => void;
}) {
  // Animate the rating number counting up/down.
  const [shownRating, setShownRating] = useState(reward ? reward.newRating - reward.ratingDelta : 0);
  useEffect(() => {
    if (!reward || reward.ratingDelta === 0) return;
    const from = reward.newRating - reward.ratingDelta;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 700);
      setShownRating(Math.round(from + reward.ratingDelta * k));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reward]);

  const title = result.draw ? 'Draw' : iWon ? 'Victory!' : 'Defeat';
  const emoji = result.draw ? '🤝' : iWon ? '🏆' : '😔';

  let xpPct = 0;
  if (reward) {
    const lo = levelThreshold(reward.newLevel), hi = levelThreshold(reward.newLevel + 1);
    xpPct = Math.max(0, Math.min(100, Math.round(((reward.newXp - lo) / (hi - lo)) * 100)));
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      {iWon && <Confetti />}
      <motion.div initial={{ scale: 0.9, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 240, damping: 20 }}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
        <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 12 }} className="text-6xl">{emoji}</motion.div>
        <h2 className={cn('mt-2 text-3xl font-extrabold', iWon ? 'text-primary' : result.draw ? 'text-foreground' : 'text-muted-foreground')}>{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{result.draw ? result.reason : winnerName ? `${winnerName} wins · ${result.reason}` : result.reason}</p>

        {reward && (
          <div className="mt-5 space-y-3">
            {reward.ranked && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-secondary/60 px-4 py-3">
                <span className="text-sm text-muted-foreground">Rating</span>
                <span className="text-2xl font-extrabold tabular-nums">{shownRating}</span>
                <span className={cn('text-sm font-bold', reward.ratingDelta > 0 ? 'text-emerald-400' : reward.ratingDelta < 0 ? 'text-red-400' : 'text-muted-foreground')}>
                  {reward.ratingDelta > 0 ? `▲ +${reward.ratingDelta}` : reward.ratingDelta < 0 ? `▼ ${reward.ratingDelta}` : '—'}
                </span>
              </div>
            )}
            <div className="rounded-xl bg-secondary/60 px-4 py-3 text-left">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Lv {reward.newLevel}</span>
                <span className="font-bold text-accent">+{reward.xpEarned} XP</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-background">
                <motion.div className="h-full bg-gradient-to-r from-primary to-accent" initial={{ width: 0 }} animate={{ width: `${xpPct}%` }} transition={{ delay: 0.3, duration: 0.6 }} />
              </div>
            </div>
            {reward.leveledUp && (
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5 }}
                className="rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 px-4 py-2 font-bold text-accent">
                ⭐ Level up! You reached Lv {reward.newLevel}
              </motion.div>
            )}
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Lobby</Button>
          {isHost && <Button className="flex-1 animate-win-glow" onClick={onPlayAgain}>↺ Play again</Button>}
        </div>
      </motion.div>
    </div>
  );
}
