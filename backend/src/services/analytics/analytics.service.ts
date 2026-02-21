import { prisma } from '../../config/prisma';
import { AppError } from '../../lib/errors';
import { CreditReason, Plan } from '@prisma/client';
import { startOfMonth, endOfMonth, startOfWeek, startOfDay, format } from 'date-fns';

const MONTHLY_GRANTS: Record<Exclude<Plan, 'ENTERPRISE'>, number> = {
  STARTER: 500,
  BUILDER: 10000,
  PRO: 50000,
};

interface SeriesEntry {
  date: string;
  messages: number;
  handoffs: number;
  avgLatencyMs: number;
}

interface AnalyticsResponse {
  series: SeriesEntry[];
  totals: {
    messages: number;
    handoffs: number;
    avgLatencyMs: number;
  };
}

interface CreditAnalyticsResponse {
  balance: number;
  plan: Plan;
  monthlyGrant: number;
  consumed: {
    messages: number;
    voice: number;
    tagging: number;
    total: number;
  };
}

interface AgentAnalyticsSummary {
  agentId: string;
  series: SeriesEntry[];
  totals: {
    messages: number;
    handoffs: number;
    avgLatencyMs: number;
  };
}

function getBucketKey(date: Date, interval: 'day' | 'week' | 'month'): string {
  if (interval === 'day') return format(date, 'yyyy-MM-dd');
  if (interval === 'week') return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  return format(date, 'yyyy-MM');
}

function groupByInterval(
  rollups: Array<{
    date: Date;
    totalMessages: number;
    handoffs: number;
    avgLatencyMs: number;
    totalConversations: number;
  }>,
  interval: 'day' | 'week' | 'month',
): SeriesEntry[] {
  const buckets = new Map<
    string,
    { messages: number; handoffs: number; totalLatencyMs: number; requestCount: number }
  >();

  for (const row of rollups) {
    const key = getBucketKey(row.date, interval);
    const existing = buckets.get(key) ?? {
      messages: 0,
      handoffs: 0,
      totalLatencyMs: 0,
      requestCount: 0,
    };
    buckets.set(key, {
      messages: existing.messages + row.totalMessages,
      handoffs: existing.handoffs + row.handoffs,
      totalLatencyMs: existing.totalLatencyMs + row.avgLatencyMs * row.totalMessages,
      requestCount: existing.requestCount + row.totalMessages,
    });
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      messages: data.messages,
      handoffs: data.handoffs,
      avgLatencyMs:
        data.requestCount > 0
          ? Math.round(data.totalLatencyMs / data.requestCount)
          : 0,
    }));
}

export async function getAnalytics(params: {
  workspaceId: string;
  from: Date;
  to: Date;
  agentId?: string;
  interval: 'day' | 'week' | 'month';
}): Promise<AnalyticsResponse> {
  const { workspaceId, from, to, agentId, interval } = params;

  const rollups = await prisma.analyticsRollup.findMany({
    where: {
      workspaceId,
      ...(agentId && { agentId }),
      date: { gte: from, lte: to },
    },
    orderBy: { date: 'asc' },
  });

  const series = groupByInterval(rollups, interval);

  const totals = series.reduce(
    (acc, entry) => ({
      messages: acc.messages + entry.messages,
      handoffs: acc.handoffs + entry.handoffs,
      totalLatencySum: acc.totalLatencySum + entry.avgLatencyMs * entry.messages,
      totalMessages: acc.totalMessages + entry.messages,
    }),
    { messages: 0, handoffs: 0, totalLatencySum: 0, totalMessages: 0 },
  );

  return {
    series,
    totals: {
      messages: totals.messages,
      handoffs: totals.handoffs,
      avgLatencyMs:
        totals.totalMessages > 0
          ? Math.round(totals.totalLatencySum / totals.totalMessages)
          : 0,
    },
  };
}

export async function getCreditAnalytics(
  workspaceId: string,
): Promise<CreditAnalyticsResponse> {
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: { plan: true },
  });

  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  const [allLedger, monthlyLedger] = await Promise.all([
    prisma.creditLedger.aggregate({
      where: { workspaceId },
      _sum: { delta: true },
    }),
    prisma.creditLedger.groupBy({
      by: ['reason'],
      where: {
        workspaceId,
        createdAt: { gte: monthStart, lte: monthEnd },
        delta: { lt: 0 },
      },
      _sum: { delta: true },
    }),
  ]);

  const balance = allLedger._sum.delta ?? 0;

  const consumed = { messages: 0, voice: 0, tagging: 0, total: 0 };
  for (const row of monthlyLedger) {
    const abs = Math.abs(row._sum.delta ?? 0);
    consumed.total += abs;
    if (row.reason === 'MESSAGE_CONSUMED') consumed.messages += abs;
    else if (row.reason === 'VOICE_CONSUMED') consumed.voice += abs;
    else if (row.reason === 'TAGGING_CONSUMED') consumed.tagging += abs;
  }

  const monthlyGrant =
    workspace.plan === 'ENTERPRISE'
      ? Infinity
      : MONTHLY_GRANTS[workspace.plan as Exclude<Plan, 'ENTERPRISE'>];

  return {
    balance,
    plan: workspace.plan,
    monthlyGrant: monthlyGrant === Infinity ? -1 : monthlyGrant,
    consumed,
  };
}

export async function getAgentAnalytics(
  workspaceId: string,
  agentId: string,
): Promise<AgentAnalyticsSummary> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { workspaceId: true },
  });

  if (!agent || agent.workspaceId !== workspaceId) {
    throw new AppError('NOT_FOUND', 404, 'Agent not found');
  }

  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);

  const result = await getAnalytics({
    workspaceId,
    from,
    to,
    agentId,
    interval: 'day',
  });

  return {
    agentId,
    series: result.series,
    totals: result.totals,
  };
}
