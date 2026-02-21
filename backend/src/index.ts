import 'dotenv/config';
import { createServer } from 'http';
import { env } from './config/env';
import { logger } from './lib/logger';
import { initSentry } from './lib/sentry';
import { createApp } from './app';

async function main() {
  // Initialize error tracking
  await initSentry();

  const app = createApp();
  const httpServer = createServer(app);

  // Socket.io (lazy import to avoid circular deps during testing)
  const { createSocketServer } = await import('./socket/socket');
  const { setSocketServer } = await import('./services/realtime/socket.service');
  const io = createSocketServer(httpServer);
  setSocketServer(io);

  httpServer.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV },
      `Axon AI API server running on port ${env.PORT}`,
    );
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down gracefully...');
    httpServer.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
