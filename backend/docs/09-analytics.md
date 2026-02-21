# Analytics Service

Analytics answers: "How is my agent performing?" across conversations, latency, handoffs, credits, and voice usage.

## Data Sources

There are two layers:

| Layer | What | When |
|---|---|---|
| **Live events** | Individual `Message` rows, `Handoff` rows | Written during the AI pipeline |
| **Rollup table** | `AnalyticsRollup` — daily aggregates per workspace/agent | Computed nightly by a BullMQ job |

The dashboard reads from the rollup table for chart series data (fast) and from raw tables for the summary stats (accurate).

---

## Rollup Job (Nightly)

Runs at 02:00 UTC every day via BullMQ repeatable job.

```ts
// queues/workers/rollup.worker.ts
async function rollupDay(date: Date, workspaceId: string): Promise<void> {
  const start = startOfDay(date);
  const end = endOfDay(date);

  // Pull raw metrics for the day
  const [messages, handoffs, latencies, voiceMinutes, credits] = await Promise.all([
    prisma.message.count({
      where: {
        conversation: { workspaceId },
        createdAt: { gte: start, lte: end },
        role: 'ASSISTANT',
      },
    }),
    prisma.handoff.count({
      where: {
        conversation: { workspaceId },
        createdAt: { gte: start, lte: end },
      },
    }),
    prisma.message.findMany({
      where: {
        conversation: { workspaceId },
        role: 'ASSISTANT',
        latencyMs: { not: null },
        createdAt: { gte: start, lte: end },
      },
      select: { latencyMs: true },
    }),
    prisma.message.aggregate({
      where: {
        conversation: { workspaceId, channelType: 'VOICE' },
        createdAt: { gte: start, lte: end },
        role: 'ASSISTANT',
      },
      _sum: { metadata: true },  // voice duration stored in metadata.durationSeconds
    }),
    prisma.creditLedger.aggregate({
      where: {
        workspaceId,
        delta: { lt: 0 },  // consumption entries are negative
        createdAt: { gte: start, lte: end },
      },
      _sum: { delta: true },
    }),
  ]);

  const latencyValues = latencies.map(m => m.latencyMs!).sort((a, b) => a - b);
  const avgLatencyMs = latencyValues.length
    ? Math.round(latencyValues.reduce((a, b) => a + b, 0) / latencyValues.length)
    : 0;
  const p95LatencyMs = latencyValues.length
    ? latencyValues[Math.floor(latencyValues.length * 0.95)]
    : 0;

  const conversations = await prisma.conversation.count({
    where: { workspaceId, createdAt: { gte: start, lte: end } },
  });

  const resolved = await prisma.conversation.count({
    where: { workspaceId, status: 'RESOLVED', resolvedAt: { gte: start, lte: end } },
  });

  await prisma.analyticsRollup.upsert({
    where: { workspaceId_agentId_date: { workspaceId, agentId: null, date: start } },
    create: {
      workspaceId,
      date: start,
      totalMessages: messages,
      totalConversations: conversations,
      handoffs,
      resolved,
      avgLatencyMs,
      p95LatencyMs,
      creditsConsumed: Math.abs(credits._sum.delta ?? 0),
    },
    update: {
      totalMessages: messages,
      totalConversations: conversations,
      handoffs,
      resolved,
      avgLatencyMs,
      p95LatencyMs,
      creditsConsumed: Math.abs(credits._sum.delta ?? 0),
    },
  });
}
```

---

## Analytics Query

```ts
// services/analytics/analytics.service.ts

async function getAnalytics(params: {
  workspaceId: string;
  from: Date;
  to: Date;
  agentId?: string;
  interval: 'day' | 'week' | 'month';
}): Promise<AnalyticsResponse> {
  const { workspaceId, from, to, agentId, interval } = params;

  // 1. Summary — query raw tables for accuracy
  const [totalMessages, totalConversations, handoffs, resolved, latencies, creditsUsed] =
    await Promise.all([
      prisma.message.count({
        where: { conversation: { workspaceId, agentId }, role: 'ASSISTANT', createdAt: { gte: from, lte: to } },
      }),
      prisma.conversation.count({
        where: { workspaceId, agentId, createdAt: { gte: from, lte: to } },
      }),
      prisma.handoff.count({
        where: { conversation: { workspaceId, agentId }, createdAt: { gte: from, lte: to } },
      }),
      prisma.conversation.count({
        where: { workspaceId, agentId, status: 'RESOLVED', resolvedAt: { gte: from, lte: to } },
      }),
      prisma.message.findMany({
        where: {
          conversation: { workspaceId, agentId },
          role: 'ASSISTANT',
          latencyMs: { not: null },
          createdAt: { gte: from, lte: to },
        },
        select: { latencyMs: true },
      }),
      prisma.creditLedger.aggregate({
        where: { workspaceId, delta: { lt: 0 }, createdAt: { gte: from, lte: to } },
        _sum: { delta: true },
      }),
    ]);

  const sortedLatencies = latencies.map(m => m.latencyMs!).sort((a, b) => a - b);
  const avgLatencyMs = sortedLatencies.length
    ? Math.round(sortedLatencies.reduce((a, b) => a + b, 0) / sortedLatencies.length)
    : 0;
  const p95LatencyMs = sortedLatencies.length
    ? sortedLatencies[Math.floor(sortedLatencies.length * 0.95)]
    : 0;

  // 2. Time series — from rollup table
  const rollups = await prisma.analyticsRollup.findMany({
    where: {
      workspaceId,
      agentId: agentId ?? null,
      date: { gte: from, lte: to },
    },
    orderBy: { date: 'asc' },
  });

  const series = groupByInterval(rollups, interval);

  return {
    summary: {
      totalMessages,
      totalConversations,
      handoffs,
      resolutionRate: totalConversations > 0 ? resolved / totalConversations : 0,
      avgLatencyMs,
      p95LatencyMs,
      creditsConsumed: Math.abs(creditsUsed._sum.delta ?? 0),
    },
    series,
  };
}
```

---

## Latency Distribution Buckets

The analytics page shows a breakdown table of latency buckets. Computed on-the-fly from raw messages:

```ts
async function getLatencyDistribution(workspaceId: string, from: Date, to: Date) {
  const latencies = await prisma.message.findMany({
    where: {
      conversation: { workspaceId },
      role: 'ASSISTANT',
      latencyMs: { not: null },
      createdAt: { gte: from, lte: to },
    },
    select: { latencyMs: true },
  });

  const buckets = { '<1s': 0, '1-2s': 0, '2-3s': 0, '3-5s': 0, '>5s': 0 };
  for (const { latencyMs } of latencies) {
    const ms = latencyMs!;
    if (ms < 1000)       buckets['<1s']++;
    else if (ms < 2000)  buckets['1-2s']++;
    else if (ms < 3000)  buckets['2-3s']++;
    else if (ms < 5000)  buckets['3-5s']++;
    else                 buckets['>5s']++;
  }

  const total = latencies.length;
  return Object.entries(buckets).map(([range, count]) => ({
    range,
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0,
  }));
}
```

---

## Export Formats

The frontend generates CSV/JSON itself from API data. The backend provides one raw-data export endpoint for large date ranges:

```
GET /v1/analytics/export?from=2026-01-01&to=2026-02-18&format=csv
```

Returns a streaming CSV response for large datasets:

```ts
router.get('/export', authenticate, requireWorkspace, async (req, res) => {
  const { from, to, format } = exportQuerySchema.parse(req.query);

  res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="analytics-${from}-to-${to}.${format}"`);

  const cursor = prisma.analyticsRollup.findMany({
    where: { workspaceId: req.workspace.id, date: { gte: new Date(from), lte: new Date(to) } },
    orderBy: { date: 'asc' },
  });

  if (format === 'csv') {
    res.write('date,messages,conversations,handoffs,avgLatencyMs,creditsConsumed\n');
    for await (const row of cursor) {
      res.write(`${row.date.toISOString().slice(0, 10)},${row.totalMessages},${row.totalConversations},${row.handoffs},${row.avgLatencyMs},${row.creditsConsumed}\n`);
    }
  }

  res.end();
});
```

---

## Per-Agent Analytics

The same service supports `agentId` filtering. The rollup job also computes per-agent rows:

```ts
// In rollupDay — run for each agent too
const agents = await prisma.agent.findMany({ where: { workspaceId }, select: { id: true } });
await Promise.all(agents.map(a => rollupDayForAgent(date, workspaceId, a.id)));
```

---

## Data Retention

| Data | Retention |
|---|---|
| `Message` rows | 12 months (then archived to cold storage) |
| `Conversation` rows | 12 months |
| `AnalyticsRollup` rows | Forever (tiny — one row per workspace per day) |
| `CreditLedger` rows | Forever (financial audit trail) |
| `Handoff` rows | 12 months |
