# Background Jobs & Queues

BullMQ (backed by Redis) handles all asynchronous and scheduled work. This keeps webhook handlers fast, retries failures automatically, and prevents blocking the main request thread.

## Queue Definitions

```ts
// src/queues/queue.ts
import { Queue } from 'bullmq';
import { redis } from '../config/redis';

const connection = redis;

export const ingestionQueue = new Queue('ingestion', { connection });
export const webhookRetryQueue = new Queue('webhook-retry', { connection });
export const analyticsRollupQueue = new Queue('analytics-rollup', { connection });
export const billingQueue = new Queue('billing', { connection });
export const emailQueue = new Queue('email', { connection });
```

---

## Jobs

### 1. Knowledge Ingestion

**Queue**: `ingestion`
**Trigger**: `POST /v1/agents/:id/knowledge` (add knowledge source)
**Retries**: 3 attempts, exponential backoff (2s, 8s, 32s)

```ts
// Job data
interface IngestionJobData {
  docId: string;
}

// Enqueue
await ingestionQueue.add('ingest', { docId: doc.id }, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: 100,
  removeOnFail: 500,
});

// Worker
const ingestionWorker = new Worker<IngestionJobData>(
  'ingestion',
  async (job) => {
    const { docId } = job.data;
    const doc = await prisma.knowledgeDoc.findUniqueOrThrow({ where: { id: docId } });

    await prisma.knowledgeDoc.update({ where: { id: docId }, data: { status: 'PROCESSING' } });

    try {
      // 1. Extract raw text from source
      const text = await extractText(doc);

      // 2. Chunk
      const chunks = chunkText(text);

      // 3. Embed in batches
      const embeddings = await embedChunks(chunks);

      // 4. Persist chunks
      await prisma.knowledgeChunk.createMany({
        data: chunks.map((content, i) => ({
          docId,
          content,
          embedding: embeddings[i],   // stored as vector(1536)
          chunkIdx: i,
        })),
      });

      await prisma.knowledgeDoc.update({
        where: { id: docId },
        data: { status: 'READY', chunkCount: chunks.length },
      });

      // Emit status update to dashboard
      socketService.emitToWorkspace(doc.workspaceId, 'knowledge_ready', { docId, chunkCount: chunks.length });
    } catch (err) {
      await prisma.knowledgeDoc.update({
        where: { id: docId },
        data: { status: 'ERROR', errorMsg: String(err) },
      });
      throw err;  // BullMQ will retry
    }
  },
  { connection, concurrency: 3 }
);
```

---

### 2. Nightly Analytics Rollup

**Queue**: `analytics-rollup`
**Trigger**: Repeatable job — every day at 02:00 UTC
**Retries**: 2 attempts

```ts
// src/queues/scheduler.ts
await analyticsRollupQueue.add(
  'daily-rollup',
  {},
  {
    repeat: { cron: '0 2 * * *' },
    attempts: 2,
    removeOnComplete: 7,   // keep last 7 job logs
    removeOnFail: 30,
  }
);

// Worker
const rollupWorker = new Worker(
  'analytics-rollup',
  async () => {
    const yesterday = subDays(new Date(), 1);
    const workspaces = await prisma.workspace.findMany({ select: { id: true } });
    await Promise.all(workspaces.map(ws => rollupDay(yesterday, ws.id)));
  },
  { connection }
);
```

---

### 3. Monthly Credit Grant

**Queue**: `billing`
**Trigger**: Repeatable job — 1st of every month at 00:05 UTC

```ts
await billingQueue.add(
  'monthly-credit-grant',
  {},
  {
    repeat: { cron: '5 0 1 * *' },
    attempts: 3,
    removeOnComplete: 12,  // keep last 12 (one year)
  }
);

const billingWorker = new Worker(
  'billing',
  async (job) => {
    if (job.name === 'monthly-credit-grant') {
      await grantMonthlyCredits();
    }
  },
  { connection }
);
```

---

### 4. Webhook Retry

**Queue**: `webhook-retry`
**Trigger**: When an outbound channel message (WhatsApp, Telegram, etc.) fails
**Retries**: 5 attempts, exponential backoff up to 30 minutes

Some platform APIs are flaky. Rather than losing messages, failed sends are queued for retry:

```ts
interface WebhookRetryJobData {
  channelType: ChannelType;
  customerId: string;
  content: string;
  workspaceId: string;
  agentId: string;
}

// Called from sender.ts on failure
await webhookRetryQueue.add('retry-send', jobData, {
  attempts: 5,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 50,
  removeOnFail: 200,
});

const webhookRetryWorker = new Worker<WebhookRetryJobData>(
  'webhook-retry',
  async (job) => {
    const { channelType, workspaceId, customerId, content } = job.data;
    const creds = await ChannelService.getDecryptedCredentials(workspaceId, channelType);
    await sendViaAdapter(channelType, customerId, content, creds);
  },
  { connection, concurrency: 5 }
);
```

---

### 5. Email Notifications

**Queue**: `email`
**Trigger**: Low credit warning, handoff notification, invoice ready

```ts
interface EmailJobData {
  to: string;
  subject: string;
  html: string;
}

await emailQueue.add('send', emailData, {
  attempts: 3,
  backoff: { type: 'fixed', delay: 10_000 },
});

const emailWorker = new Worker<EmailJobData>(
  'email',
  async (job) => {
    await resend.emails.send({
      from: env.RESEND_FROM,
      to: job.data.to,
      subject: job.data.subject,
      html: job.data.html,
    });
  },
  { connection, concurrency: 10 }
);
```

---

## Error Handling in Workers

All workers follow the same pattern:

```ts
worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, jobName: job?.name, err }, 'Job failed');
  Sentry.captureException(err, { extra: { jobId: job?.id, data: job?.data } });
});

worker.on('completed', (job) => {
  logger.info({ jobId: job.id, jobName: job.name }, 'Job completed');
});
```

---

## Bull Board (Dev Dashboard)

```ts
// src/index.ts (dev only)
if (env.NODE_ENV === 'development') {
  const { createBullBoard } = await import('@bull-board/api');
  const { BullMQAdapter } = await import('@bull-board/api/bullMQAdapter');
  const { ExpressAdapter } = await import('@bull-board/express');

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [
      new BullMQAdapter(ingestionQueue),
      new BullMQAdapter(webhookRetryQueue),
      new BullMQAdapter(analyticsRollupQueue),
      new BullMQAdapter(billingQueue),
      new BullMQAdapter(emailQueue),
    ],
    serverAdapter,
  });

  app.use('/admin/queues', serverAdapter.getRouter());
}
```

Access at `http://localhost:3001/admin/queues` in development.

---

## Starting Workers

Workers run in the same process as the API server in development. In production, they should be separate Node.js processes (separate Railway/Render services) for independent scaling and failure isolation:

```
# package.json scripts
"start:api":     "node dist/index.js"
"start:workers": "node dist/queues/workers/index.js"
```

```ts
// src/queues/workers/index.ts — worker process entry point
import './ingestion.worker';
import './rollup.worker';
import './billing.worker';
import './webhook-retry.worker';
import './email.worker';
import '../scheduler';  // registers repeatable jobs

logger.info('Workers started');
```
