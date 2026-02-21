import { prisma } from '../../config/prisma';
import { redis } from '../../config/redis';
import { AppError } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { CreditReason, Plan } from '@prisma/client';
import { Resend } from 'resend';
import { env } from '../../config/env';

const MONTHLY_GRANTS: Record<Exclude<Plan, 'ENTERPRISE'>, number> = {
  STARTER: 500,
  BUILDER: 10000,
  PRO: 50000,
};

const CREDIT_CACHE_TTL = 60; // seconds
const LOW_CREDIT_ALERT_TTL = 86400; // 24 hours

function creditCacheKey(workspaceId: string): string {
  return `credits:${workspaceId}`;
}

function lowCreditAlertKey(workspaceId: string): string {
  return `low_credits_alert:${workspaceId}`;
}

async function invalidateCache(workspaceId: string): Promise<void> {
  await redis.del(creditCacheKey(workspaceId));
}

export async function getBalance(workspaceId: string): Promise<number> {
  const cacheKey = creditCacheKey(workspaceId);
  const cached = await redis.get(cacheKey);

  if (cached !== null) {
    return parseInt(cached, 10);
  }

  const result = await prisma.creditLedger.aggregate({
    where: { workspaceId },
    _sum: { delta: true },
  });

  const balance = result._sum.delta ?? 0;
  await redis.set(cacheKey, balance.toString(), 'EX', CREDIT_CACHE_TTL);

  return balance;
}

export async function deductCredits(
  workspaceId: string,
  amount: number,
  reason: CreditReason,
  refId?: string,
): Promise<void> {
  const balance = await getBalance(workspaceId);

  if (balance < amount) {
    throw new AppError(
      'INSUFFICIENT_CREDITS',
      402,
      `Insufficient credits. Balance: ${balance}, required: ${amount}.`,
    );
  }

  const newBalance = balance - amount;

  await prisma.creditLedger.create({
    data: {
      workspaceId,
      delta: -amount,
      reason,
      refId,
      balance: newBalance,
    },
  });

  await invalidateCache(workspaceId);

  await checkLowCredits(workspaceId);
}

export async function grantCredits(
  workspaceId: string,
  amount: number,
  reason: CreditReason,
  refId?: string,
): Promise<void> {
  const currentBalance = await getBalance(workspaceId);

  await prisma.creditLedger.create({
    data: {
      workspaceId,
      delta: amount,
      reason,
      refId,
      balance: currentBalance + amount,
    },
  });

  await invalidateCache(workspaceId);
  logger.info({ workspaceId, amount, reason }, 'Credits granted');
}

export async function grantMonthlyCredits(): Promise<void> {
  const workspaces = await prisma.workspace.findMany({
    where: { plan: { not: 'ENTERPRISE' } },
    select: { id: true, plan: true },
  });

  let granted = 0;

  for (const workspace of workspaces) {
    const amount = MONTHLY_GRANTS[workspace.plan as Exclude<Plan, 'ENTERPRISE'>];
    if (!amount) continue;

    await grantCredits(workspace.id, amount, 'PLAN_GRANT' as CreditReason);
    granted++;
  }

  logger.info({ count: granted }, 'Monthly credits granted');
}

export async function checkLowCredits(workspaceId: string): Promise<void> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { plan: true, id: true },
  });

  if (!workspace || workspace.plan === 'ENTERPRISE') return;

  const monthlyGrant = MONTHLY_GRANTS[workspace.plan as Exclude<Plan, 'ENTERPRISE'>];
  const threshold = monthlyGrant * 0.1;

  const balance = await getBalance(workspaceId);
  if (balance > threshold) return;

  const alertKey = lowCreditAlertKey(workspaceId);
  const alreadyAlerted = await redis.exists(alertKey);
  if (alreadyAlerted) return;

  const workspaceData = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: {
        where: { role: 'OWNER' },
        include: { user: { select: { email: true, name: true } } },
        take: 1,
      },
    },
  });

  const ownerEmail = workspaceData?.members[0]?.user?.email;
  if (!ownerEmail) return;

  try {
    const resend = new Resend(env.RESEND_API_KEY);
    await resend.emails.send({
      from: env.RESEND_FROM ?? 'noreply@axon.ai',
      to: ownerEmail,
      subject: 'Low credit balance warning',
      html: `
        <p>Your Axon AI workspace is running low on credits.</p>
        <p>Current balance: <strong>${balance}</strong> credits (${Math.round((balance / monthlyGrant) * 100)}% of monthly grant).</p>
        <p>Please upgrade your plan or purchase additional credits to avoid service interruption.</p>
      `,
    });

    await redis.set(alertKey, '1', 'EX', LOW_CREDIT_ALERT_TTL);
    logger.info({ workspaceId, balance }, 'Low credits alert sent');
  } catch (err) {
    logger.error({ err, workspaceId }, 'Failed to send low credits alert email');
  }
}
