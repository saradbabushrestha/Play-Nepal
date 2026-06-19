import type { GameResult, MatchReward } from '@play-nepal/shared';
import { prisma } from '../prisma.js';

const K = 32; // ELO sensitivity
const BASE = 1200;

const expected = (a: number, b: number) => 1 / (1 + 10 ** ((b - a) / 400));

/** XP for level n→n+1 grows quadratically; returns the level for a given XP. */
export function levelForXp(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(xp / 100)) + 1);
}

interface FinishedPlayer {
  userId: string;
  /** engine playerId used to read the result. */
  playerId: string;
}

/**
 * Apply the outcome of a finished 2-player ranked match: update ELO for both
 * sides, write GameHistory rows, award XP, and bump profile aggregates.
 * AI seats (userId === null) are skipped but still count as the opponent.
 */
export async function recordMatchResult(params: {
  matchId: string;
  gameId: string;
  ranked: boolean;
  result: GameResult;
  players: Array<FinishedPlayer & { isAI: boolean }>;
}): Promise<Map<string, MatchReward>> {
  const { gameId, ranked, result } = params;
  const rewards = new Map<string, MatchReward>();
  const humans = params.players.filter((p) => !p.isAI);
  if (humans.length === 0) return rewards;

  // Load or default ratings.
  const ratings = new Map<string, number>();
  for (const p of humans) {
    const r = await prisma.rating.findUnique({ where: { userId_gameId: { userId: p.userId, gameId } } });
    ratings.set(p.userId, r?.rating ?? BASE);
  }

  for (const p of params.players) {
    if (p.isAI) continue;
    const outcome: 'WIN' | 'LOSS' | 'DRAW' = result.draw
      ? 'DRAW'
      : result.winnerId === p.playerId
        ? 'WIN'
        : 'LOSS';
    const score = outcome === 'WIN' ? 1 : outcome === 'DRAW' ? 0.5 : 0;

    // Average expected score against every other seat.
    const others = params.players.filter((o) => o.playerId !== p.playerId);
    const myRating = ratings.get(p.userId) ?? BASE;
    let exp = 0;
    for (const o of others) {
      const oppRating = o.isAI ? BASE : ratings.get(o.userId) ?? BASE;
      exp += expected(myRating, oppRating);
    }
    exp /= Math.max(1, others.length);

    const delta = ranked ? Math.round(K * (score - exp)) : 0;
    const xpEarned = outcome === 'WIN' ? 50 : outcome === 'DRAW' ? 25 : 10;

    const reward = await prisma.$transaction(async (tx): Promise<MatchReward> => {
      let newRating = myRating;
      if (ranked) {
        const existing = await tx.rating.findUnique({ where: { userId_gameId: { userId: p.userId, gameId } } });
        newRating = (existing?.rating ?? BASE) + delta;
        await tx.rating.upsert({
          where: { userId_gameId: { userId: p.userId, gameId } },
          create: {
            userId: p.userId, gameId, rating: newRating, peak: newRating,
            wins: outcome === 'WIN' ? 1 : 0, losses: outcome === 'LOSS' ? 1 : 0, draws: outcome === 'DRAW' ? 1 : 0,
          },
          update: {
            rating: newRating,
            peak: Math.max(existing?.peak ?? BASE, newRating),
            wins: { increment: outcome === 'WIN' ? 1 : 0 },
            losses: { increment: outcome === 'LOSS' ? 1 : 0 },
            draws: { increment: outcome === 'DRAW' ? 1 : 0 },
          },
        });
      }

      await tx.gameHistory.create({
        data: { userId: p.userId, matchId: params.matchId, gameId, outcome, ratingDelta: delta, xpEarned },
      });

      const before = await tx.user.findUnique({ where: { id: p.userId }, select: { level: true } });
      const user = await tx.user.update({
        where: { id: p.userId },
        data: { xp: { increment: xpEarned } },
        select: { xp: true },
      });
      const newLevel = levelForXp(user.xp);
      await tx.user.update({ where: { id: p.userId }, data: { level: newLevel } });

      await tx.profile.update({
        where: { userId: p.userId },
        data: {
          gamesPlayed: { increment: 1 },
          totalWins: { increment: outcome === 'WIN' ? 1 : 0 },
          totalLosses: { increment: outcome === 'LOSS' ? 1 : 0 },
          totalDraws: { increment: outcome === 'DRAW' ? 1 : 0 },
        },
      });

      return {
        outcome, ratingDelta: delta, newRating, xpEarned, newXp: user.xp,
        newLevel, leveledUp: newLevel > (before?.level ?? 1), ranked,
      };
    });
    rewards.set(p.userId, reward);
  }
  return rewards;
}
