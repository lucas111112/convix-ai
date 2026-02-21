import { prisma } from '../../config/prisma';
import { AppError } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { Plan } from '@prisma/client';

const PLAN_AGENT_LIMITS: Record<Plan, number> = {
  STARTER: 1,
  BUILDER: 5,
  PRO: 20,
  ENTERPRISE: Infinity,
};

export async function listAgents(workspaceId: string) {
  const agents = await prisma.agent.findMany({
    where: { workspaceId },
    include: {
      channels: {
        where: { isActive: true },
        include: {
          channel: { select: { type: true, isActive: true } },
        },
      },
      _count: {
        select: {
          channels: true,
          knowledgeDocs: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    avatar: agent.avatar,
    status: agent.status,
    mode: agent.mode,
    systemPrompt: agent.systemPrompt,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
    channelCount: agent._count.channels,
    knowledgeCount: agent._count.knowledgeDocs,
    activeChannelTypes: agent.channels
      .filter((ac) => ac.channel.isActive)
      .map((ac) => ac.channel.type as string),
  }));
}

export async function createAgent(
  workspaceId: string,
  data: {
    name: string;
    avatar?: string;
    systemPrompt?: string;
    mode?: string;
    voiceEnabled?: boolean;
    handoffEnabled?: boolean;
    handoffThreshold?: number;
    handoffDest?: string;
    routingPolicy?: string;
  },
) {
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: { plan: true },
  });

  const limit = PLAN_AGENT_LIMITS[workspace.plan];
  const existingCount = await prisma.agent.count({ where: { workspaceId } });

  if (existingCount >= limit) {
    throw new AppError(
      'AGENT_LIMIT_REACHED',
      402,
      `Your ${workspace.plan} plan allows a maximum of ${limit === Infinity ? 'unlimited' : limit} agent(s). Please upgrade to create more.`,
    );
  }

  const agent = await prisma.$transaction(async (tx) => {
    const newAgent = await tx.agent.create({
      data: {
        workspaceId,
        name: data.name,
        avatar: data.avatar ?? '🤖',
        systemPrompt: data.systemPrompt ?? '',
        mode: (data.mode as any) ?? 'TEXT',
        voiceEnabled: data.voiceEnabled ?? false,
        handoffEnabled: data.handoffEnabled ?? false,
        handoffThreshold: data.handoffThreshold ?? 0.65,
        handoffDest: (data.handoffDest as any) ?? 'NONE',
        routingPolicy: data.routingPolicy,
      },
    });

    await tx.widgetConfig.create({
      data: {
        agentId: newAgent.id,
        primaryColor: '#6d28d9',
        headerTitle: newAgent.name,
        greeting: 'Hi! How can I help?',
        inputPlaceholder: 'Type a message…',
        position: 'bottom-right',
      },
    });

    return newAgent;
  });

  logger.info({ agentId: agent.id, workspaceId }, 'Agent created');
  return agent;
}

export async function getAgent(workspaceId: string, agentId: string) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      channels: {
        include: { channel: true },
      },
      knowledgeDocs: {
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          chunkCount: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      widgetConfig: true,
    },
  });

  if (!agent || agent.workspaceId !== workspaceId) {
    throw new AppError('NOT_FOUND', 404, 'Agent not found');
  }

  return agent;
}

export async function updateAgent(
  workspaceId: string,
  agentId: string,
  data: Partial<{
    name: string;
    avatar: string;
    systemPrompt: string;
    mode: string;
    status: string;
    voiceEnabled: boolean;
    handoffEnabled: boolean;
    handoffThreshold: number;
    handoffDest: string;
    routingPolicy: string;
    supportEmail: string;
    businessHours: unknown;
    taggingEnabled: boolean;
    availableTags: string[];
  }>,
) {
  const existing = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { workspaceId: true },
  });

  if (!existing || existing.workspaceId !== workspaceId) {
    throw new AppError('NOT_FOUND', 404, 'Agent not found');
  }

  return prisma.agent.update({
    where: { id: agentId },
    data: data as any,
  });
}

export async function deleteAgent(workspaceId: string, agentId: string) {
  const existing = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { workspaceId: true },
  });

  if (!existing || existing.workspaceId !== workspaceId) {
    throw new AppError('NOT_FOUND', 404, 'Agent not found');
  }

  await prisma.agent.delete({ where: { id: agentId } });
  logger.info({ agentId, workspaceId }, 'Agent deleted');
}

// ── Channel management ────────────────────────────────────────────────────────

export async function getAgentChannels(workspaceId: string, agentId: string) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { workspaceId: true },
  });

  if (!agent || agent.workspaceId !== workspaceId) {
    throw new AppError('NOT_FOUND', 404, 'Agent not found');
  }

  const workspaceChannels = await prisma.channel.findMany({
    where: { workspaceId },
    include: {
      agentChannel: {
        where: { agentId },
      },
    },
  });

  return workspaceChannels.map((ch) => ({
    id: ch.id,
    type: ch.type,
    isActive: ch.isActive,
    isConnected: ch.agentChannel.length > 0 && ch.agentChannel[0].isActive,
    hasCredentials: !!ch.credentials,
  }));
}

export async function connectAgentChannel(
  workspaceId: string,
  agentId: string,
  channelType: string,
  data: { credentials?: Record<string, string>; isActive?: boolean },
) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { workspaceId: true },
  });

  if (!agent || agent.workspaceId !== workspaceId) {
    throw new AppError('NOT_FOUND', 404, 'Agent not found');
  }

  const { encryptCredentials } = await import('../../lib/crypto');

  // Upsert workspace-level channel record with credentials
  const encryptedCreds = data.credentials ? encryptCredentials(data.credentials) : undefined;

  const channel = await prisma.channel.upsert({
    where: { workspaceId_type: { workspaceId, type: channelType as any } },
    create: {
      workspaceId,
      type: channelType as any,
      isActive: data.isActive ?? true,
      ...(encryptedCreds && { credentials: encryptedCreds }),
    },
    update: {
      isActive: data.isActive ?? true,
      ...(encryptedCreds && { credentials: encryptedCreds }),
    },
  });

  // Link agent to this channel (upsert)
  await prisma.agentChannel.upsert({
    where: { agentId_channelId: { agentId, channelId: channel.id } },
    create: { agentId, channelId: channel.id, isActive: true },
    update: { isActive: true },
  });

  // Auto-register Telegram webhook when bot token is saved
  if (channelType === 'TELEGRAM' && data.credentials?.botToken) {
    try {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { slug: true },
      });
      if (workspace?.slug) {
        const { registerWebhook } = await import('../channels/adapters/telegram.adapter');
        await registerWebhook(data.credentials.botToken, workspace.slug);
        logger.info({ workspaceId, agentId }, 'Telegram webhook auto-registered');
      }
    } catch (webhookErr) {
      // Non-fatal: log and continue – user can re-save credentials to retry
      logger.warn({ webhookErr, workspaceId }, 'Failed to auto-register Telegram webhook');
    }
  }

  logger.info({ agentId, channelType, workspaceId }, 'Agent channel connected');
  return { id: channel.id, type: channel.type, isActive: channel.isActive, isConnected: true };
}

export async function disconnectAgentChannel(
  workspaceId: string,
  agentId: string,
  channelType: string,
) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { workspaceId: true },
  });

  if (!agent || agent.workspaceId !== workspaceId) {
    throw new AppError('NOT_FOUND', 404, 'Agent not found');
  }

  const channel = await prisma.channel.findUnique({
    where: { workspaceId_type: { workspaceId, type: channelType as any } },
    select: { id: true },
  });

  if (!channel) return;

  await prisma.agentChannel.deleteMany({
    where: { agentId, channelId: channel.id },
  });

  logger.info({ agentId, channelType, workspaceId }, 'Agent channel disconnected');
}
