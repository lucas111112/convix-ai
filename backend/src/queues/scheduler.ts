import { analyticsRollupQueue, billingQueue } from './queue';
import { logger } from '../lib/logger';

export async function registerScheduledJobs(): Promise<void> {
  // Nightly analytics rollup at 02:00 UTC
  await analyticsRollupQueue.add(
    'daily-rollup',
    {},
    {
      repeat: { pattern: '0 2 * * *' },
      attempts: 2,
      removeOnComplete: { count: 7 },
      removeOnFail: { count: 30 },
    },
  );

  // Monthly credit grant on 1st of month at 00:05 UTC
  await billingQueue.add(
    'monthly-credit-grant',
    {},
    {
      repeat: { pattern: '5 0 1 * *' },
      attempts: 3,
      removeOnComplete: { count: 12 },
    },
  );

  logger.info('Scheduled jobs registered');
}
