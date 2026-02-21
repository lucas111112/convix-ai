import { Queue } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import { redis } from '../config/redis';

// The shared ioredis instance satisfies BullMQ's ConnectionOptions at runtime.
// The cast is needed because the project uses ioredis v5 and BullMQ bundles
// its own ioredis type declarations which don't match exactly.
const connection = redis as unknown as ConnectionOptions;

export const ingestionQueue = new Queue('ingestion', { connection });
export const webhookRetryQueue = new Queue('webhook-retry', { connection });
export const analyticsRollupQueue = new Queue('analytics-rollup', { connection });
export const billingQueue = new Queue('billing', { connection });
export const emailQueue = new Queue('email', { connection });
