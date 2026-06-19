import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env } from './env.js';
import { logger } from './logger.js';
import { prisma } from './prisma.js';
import { attachSocketServer } from './socket/index.js';

async function main() {
  const app = createApp();
  const httpServer = createServer(app);
  attachSocketServer(httpServer);

  httpServer.listen(env.SERVER_PORT, () => {
    logger.info(`🎮 Play Nepal API + realtime listening on :${env.SERVER_PORT}`);
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down…');
    httpServer.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
