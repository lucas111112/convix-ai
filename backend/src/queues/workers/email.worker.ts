import { Worker, Job } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import { Resend } from 'resend';
import { redis } from '../../config/redis';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { captureException } from '../../lib/sentry';

const resend = new Resend(env.RESEND_API_KEY);
const connection = redis as unknown as ConnectionOptions;

interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const emailWorker = new Worker<EmailJobData>(
  'email',
  async (job: Job<EmailJobData>) => {
    await resend.emails.send({
      from: env.RESEND_FROM ?? 'noreply@convix.ai',
      to: job.data.to,
      subject: job.data.subject,
      html: job.data.html,
      ...(job.data.text ? { text: job.data.text } : {}),
    });
    logger.info({ to: job.data.to, subject: job.data.subject }, 'Email sent');
  },
  { connection, concurrency: 10 },
);

emailWorker.on('failed', async (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Email job failed');
  await captureException(err, { jobId: job?.id });
});

emailWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Email job completed');
});

export { emailWorker };
