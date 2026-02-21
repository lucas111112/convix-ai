import { prisma } from '../../config/prisma';
import { AppError } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { encryptCredentials, decryptCredentials } from '../../lib/crypto';
import { ChannelType } from '@prisma/client';

export async function listChannels(workspaceId: string) {
  const channels = await prisma.channel.findMany({
    where: { workspaceId },
    select: {
      id: true,
      type: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { agentChannel: true } },
    },
    orderBy: { type: 'asc' },
  });

  return channels.map((ch) => ({
    id: ch.id,
    type: ch.type,
    isActive: ch.isActive,
    agentCount: ch._count.agentChannel,
    createdAt: ch.createdAt,
    updatedAt: ch.updatedAt,
  }));
}

export async function upsertChannel(
  workspaceId: string,
  type: ChannelType,
  data: { isActive: boolean; credentials?: Record<string, string> },
) {
  const encryptedCredentials = data.credentials
    ? encryptCredentials(data.credentials)
    : undefined;

  const channel = await prisma.channel.upsert({
    where: { workspaceId_type: { workspaceId, type } },
    create: {
      workspaceId,
      type,
      isActive: data.isActive,
      ...(encryptedCredentials !== undefined && {
        credentials: encryptedCredentials,
      }),
    },
    update: {
      isActive: data.isActive,
      ...(encryptedCredentials !== undefined && {
        credentials: encryptedCredentials,
      }),
    },
    select: {
      id: true,
      type: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  logger.info({ channelId: channel.id, type, workspaceId }, 'Channel upserted');
  return channel;
}

export async function getDecryptedCredentials(
  workspaceId: string,
  type: ChannelType,
): Promise<Record<string, string>> {
  const channel = await prisma.channel.findUnique({
    where: { workspaceId_type: { workspaceId, type } },
    select: { credentials: true },
  });

  if (!channel) {
    throw new AppError('NOT_FOUND', 404, `Channel ${type} not found for this workspace`);
  }

  if (!channel.credentials) {
    return {};
  }

  return decryptCredentials(channel.credentials);
}

export async function enableAgentChannel(
  workspaceId: string,
  agentId: string,
  channelId: string,
  isActive: boolean,
) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { workspaceId: true },
  });

  if (!agent || agent.workspaceId !== workspaceId) {
    throw new AppError('NOT_FOUND', 404, 'Agent not found');
  }

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { workspaceId: true },
  });

  if (!channel || channel.workspaceId !== workspaceId) {
    throw new AppError('NOT_FOUND', 404, 'Channel not found');
  }

  const agentChannel = await prisma.agentChannel.upsert({
    where: { agentId_channelId: { agentId, channelId } },
    create: { agentId, channelId, isActive },
    update: { isActive },
  });

  logger.info({ agentId, channelId, isActive }, 'Agent channel updated');
  return agentChannel;
}

export async function getWidgetConfig(agentId: string) {
  const config = await prisma.widgetConfig.findUnique({
    where: { agentId },
  });

  if (!config) {
    throw new AppError('NOT_FOUND', 404, 'Widget config not found');
  }

  return config;
}

export async function updateWidgetConfig(
  workspaceId: string,
  agentId: string,
  data: Partial<{
    primaryColor: string;
    headerTitle: string;
    welcomeMessage: string;
    inputPlaceholder: string;
    showBranding: boolean;
    position: string;
    logoUrl: string;
    allowedOrigins: string[];
  }>,
) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { workspaceId: true },
  });

  if (!agent || agent.workspaceId !== workspaceId) {
    throw new AppError('NOT_FOUND', 404, 'Agent not found');
  }

  return prisma.widgetConfig.update({
    where: { agentId },
    data,
  });
}
