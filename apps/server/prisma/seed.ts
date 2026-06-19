import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { GAME_CATALOG } from '@play-nepal/shared';

const prisma = new PrismaClient();

const ACHIEVEMENTS = [
  { id: 'first-win', name: 'First Blood', description: 'Win your first match.', xpReward: 50, rule: { type: 'wins', count: 1 } },
  { id: 'win-10', name: 'On a Roll', description: 'Win 10 matches.', xpReward: 150, rule: { type: 'wins', count: 10 } },
  { id: 'win-100', name: 'Centurion', description: 'Win 100 matches.', xpReward: 1000, rule: { type: 'wins', count: 100 } },
  { id: 'baghchal-master', name: 'Baghchal Master', description: 'Win 25 Baghchal matches.', xpReward: 500, rule: { type: 'gameWins', gameId: 'baghchal', count: 25 } },
  { id: 'tournament-winner', name: 'Champion', description: 'Win a tournament.', xpReward: 800, rule: { type: 'tournamentWins', count: 1 } },
  { id: 'quiz-champion', name: 'Quiz Champion', description: 'Top a quiz leaderboard.', xpReward: 300, rule: { type: 'quizTop', count: 1 } },
];

async function main() {
  console.log('🌱 Seeding game catalogue…');
  for (const g of GAME_CATALOG) {
    await prisma.game.upsert({
      where: { id: g.id },
      update: {
        name: g.name,
        category: g.category,
        shortDescription: g.shortDescription,
        minPlayers: g.minPlayers,
        maxPlayers: g.maxPlayers,
        supportsAI: g.supportsAI,
        supportsSpectators: g.supportsSpectators,
        ranked: g.ranked,
        status: g.status === 'live' ? 'LIVE' : g.status === 'beta' ? 'BETA' : 'PLANNED',
      },
      create: {
        id: g.id,
        name: g.name,
        category: g.category,
        shortDescription: g.shortDescription,
        minPlayers: g.minPlayers,
        maxPlayers: g.maxPlayers,
        supportsAI: g.supportsAI,
        supportsSpectators: g.supportsSpectators,
        ranked: g.ranked,
        status: g.status === 'live' ? 'LIVE' : g.status === 'beta' ? 'BETA' : 'PLANNED',
      },
    });
  }

  console.log('🏅 Seeding achievements…');
  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { id: a.id },
      update: { name: a.name, description: a.description, xpReward: a.xpReward, rule: a.rule },
      create: a,
    });
  }

  console.log('👤 Seeding demo accounts…');
  const passwordHash = await bcrypt.hash('password123', 12);
  for (const [username, displayName] of [
    ['sagar', 'Sagar Thapa'],
    ['anjali', 'Anjali Gurung'],
    ['bibek', 'Bibek Shrestha'],
  ] as const) {
    await prisma.user.upsert({
      where: { username },
      update: {},
      create: {
        email: `${username}@playnepal.test`,
        username,
        displayName,
        passwordHash,
        country: 'NP',
        city: 'Kathmandu',
        profile: { create: {} },
      },
    });
  }

  console.log('✅ Seed complete. Demo login: sagar / password123');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
