import { Worker, Job } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import { redis } from '../../config/redis';
import { logger } from '../../lib/logger';
import { captureException } from '../../lib/sentry';

// Provided by the billing agent
import { grantMonthlyCredits } from '../../services/billing/credit.service';

const connection = redis as unknown as ConnectionOptions;

const billingWorker = new Worker(
  'billing',
  async (job: Job) => {
    if (job.name === 'monthly-credit-grant') {
      await grantMonthlyCredits();
      logger.info('Monthly credits granted');
    }
  },
  { connection },
);

billingWorker.on('failed', async (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Billing job failed');
  await captureException(err, { jobId: job?.id });
});

billingWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Billing job completed');
});

export { billingWorker };
