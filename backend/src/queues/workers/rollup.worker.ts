import { Worker } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { redis } from '../../config/redis';
import { prisma } from '../../config/prisma';
import { logger } from '../../lib/logger';
import { captureException } from '../../lib/sentry';

const connection = redis as unknown as ConnectionOptions;

async function rollupDay(date: Date, workspaceId: string, agentId?: string | null): Promise<void> {
  const start = startOfDay(date);
  const end = endOfDay(date);

  const agentFilter = agentId ? { agentId } : {};

  const conversationWhere = { workspaceId, ...agentFilter, createdAt: { gte: start, lte: end } };

  const [messages, handoffs, latencies, conversations, resolved, credits] = await Promise.all([
    prisma.message.count({
      where: {
        conversation: { workspaceId, ...agentFilter },
        createdAt: { gte: start, lte: end },
        role: 'ASSISTANT',
      },
    }),
    prisma.handoff.count({
      where: {
        conversation: { workspaceId, ...agentFilter },
        createdAt: { gte: start, lte: end },
      },
    }),
    prisma.message.findMany({
      where: {
        conversation: { workspaceId, ...agentFilter },
        role: 'ASSISTANT',
        latencyMs: { not: null },
        createdAt: { gte: start, lte: end },
      },
      select: { latencyMs: true },
    }),
    prisma.conversation.count({ where: conversationWhere }),
    prisma.conversation.count({
      where: {
        ...conversationWhere,
        status: 'RESOLVED',
        resolvedAt: { gte: start, lte: end },
      },
    }),
    prisma.creditLedger.aggregate({
      where: { workspaceId, delta: { lt: 0 }, createdAt: { gte: start, lte: end } },
      _sum: { delta: true },
    }),
  ]);

  const latencyValues = latencies
    .map((m) => m.latencyMs as number)
    .sort((a, b) => a - b);

  const avgLatencyMs = latencyValues.length
    ? Math.round(latencyValues.reduce((a, b) => a + b, 0) / latencyValues.length)
    : 0;

  const p95LatencyMs = latencyValues.length
    ? latencyValues[Math.floor(latencyValues.length * 0.95)]
    : 0;

  const rollupData = {
    totalMessages: messages,
    totalConversations: conversations,
    handoffs,
    resolved,
    avgLatencyMs,
    p95LatencyMs,
    creditsConsumed: Math.abs(credits._sum.delta ?? 0),
  };

  // Prisma compound unique keys with nullable fields need special handling.
  // We find an existing record first, then create or update.
  const existing = await prisma.analyticsRollup.findFirst({
    where: { workspaceId, agentId: agentId ?? null, date: start },
  });

  if (existing) {
    await prisma.analyticsRollup.update({
      where: { id: existing.id },
      data: rollupData,
    });
  } else {
    await prisma.analyticsRollup.create({
      data: {
        workspaceId,
        agentId: agentId ?? null,
        date: start,
        ...rollupData,
      },
    });
  }
}

const rollupWorker = new Worker(
  'analytics-rollup',
  async () => {
    const yesterday = subDays(new Date(), 1);
    const workspaces = await prisma.workspace.findMany({ select: { id: true } });

    for (const ws of workspaces) {
      await rollupDay(yesterday, ws.id);

      const agents = await prisma.agent.findMany({
        where: { workspaceId: ws.id },
        select: { id: true },
      });

      await Promise.all(agents.map((a) => rollupDay(yesterday, ws.id, a.id)));
    }

    logger.info('Analytics rollup complete');
  },
  { connection },
);

rollupWorker.on('failed', async (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Rollup job failed');
  await captureException(err, { jobId: job?.id });
});

rollupWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Rollup job completed');
});

export { rollupWorker };
