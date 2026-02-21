import 'dotenv/config';
import { logger } from '../../lib/logger';
import { initSentry } from '../../lib/sentry';

async function startWorkers() {
  await initSentry();

  // Import all workers (they register themselves on import)
  const { ingestionWorker } = await import('./ingestion.worker');
  const { rollupWorker } = await import('./rollup.worker');
  const { billingWorker } = await import('./billing.worker');
  const { webhookRetryWorker } = await import('./webhook-retry.worker');
  const { emailWorker } = await import('./email.worker');

  // Register scheduled jobs
  const { registerScheduledJobs } = await import('../scheduler');
  await registerScheduledJobs();

  logger.info('All workers started');

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down workers...');
    await Promise.all([
      ingestionWorker.close(),
      rollupWorker.close(),
      billingWorker.close(),
      webhookRetryWorker.close(),
      emailWorker.close(),
    ]);
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startWorkers().catch((err) => {
  console.error('Failed to start workers:', err);
  process.exit(1);
});
