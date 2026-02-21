import { Worker, Job } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import { redis } from '../../config/redis';
import { logger } from '../../lib/logger';
import { captureException } from '../../lib/sentry';

// Provided by the channels agent
import { sendMessage } from '../../services/channels/sender';

interface WebhookRetryJobData {
  channelType: string;
  customerId: string;
  content: string;
  workspaceId: string;
  agentId: string;
}

const connection = redis as unknown as ConnectionOptions;

const webhookRetryWorker = new Worker<WebhookRetryJobData>(
  'webhook-retry',
  async (job: Job<WebhookRetryJobData>) => {
    const { channelType, workspaceId, customerId, content } = job.data;
    await sendMessage(channelType, customerId, content, workspaceId);
    logger.info({ channelType, workspaceId }, 'Webhook retry sent');
  },
  { connection, concurrency: 5 },
);

webhookRetryWorker.on('failed', async (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Webhook retry job failed');
  await captureException(err, { jobId: job?.id, data: job?.data });
});

webhookRetryWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Webhook retry job completed');
});

export { webhookRetryWorker };
