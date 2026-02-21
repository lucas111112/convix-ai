import { prisma } from '../../config/prisma';
import { AppError } from '../../lib/errors';
import { ChannelType, ConversationStatus } from '@prisma/client';

interface ListConversationsFilters {
  agentId?: string;
  status?: ConversationStatus;
  channelType?: ChannelType;
  from?: Date;
  to?: Date;
  limit?: number;
  cursor?: string;
}

export async function listConversations(
  workspaceId: string,
  filters: ListConversationsFilters = {},
) {
  const { agentId, status, channelType, from, to, cursor } = filters;
  const limit = Math.min(filters.limit ?? 20, 100);

  const where: any = {
    workspaceId,
    ...(agentId && { agentId }),
    ...(status && { status }),
    ...(channelType && { channelType }),
    ...(from || to
      ? {
          createdAt: {
            ...(from && { gte: from }),
            ...(to && { lte: to }),
          },
        }
      : {}),
  };

  const conversations = await prisma.conversation.findMany({
    where,
    take: limit + 1,
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      status: true,
      channelType: true,
      customerId: true,
      customerName: true,
      tags: true,
      metadata: true,
      resolvedAt: true,
      createdAt: true,
      updatedAt: true,
      agentId: true,
      agent: { select: { name: true } },
      _count: { select: { messages: true } },
    },
  });

  const hasNextPage = conversations.length > limit;
  const items = hasNextPage ? conversations.slice(0, limit) : conversations;
  const nextCursor = hasNextPage ? items[items.length - 1].id : null;

  return { items, nextCursor, hasNextPage };
}

export async function getConversation(
  workspaceId: string,
  conversationId: string,
) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
      agent: { select: { id: true, name: true } },
      handoffs: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  });

  if (!conversation || conversation.workspaceId !== workspaceId) {
    throw new AppError('NOT_FOUND', 404, 'Conversation not found');
  }

  return conversation;
}

export async function updateConversation(
  workspaceId: string,
  conversationId: string,
  data: {
    status?: ConversationStatus;
    tags?: string[];
    metadata?: Record<string, unknown>;
  },
) {
  const existing = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { workspaceId: true },
  });

  if (!existing || existing.workspaceId !== workspaceId) {
    throw new AppError('NOT_FOUND', 404, 'Conversation not found');
  }

  const updateData: any = { ...data };

  if (data.status === 'RESOLVED') {
    updateData.resolvedAt = new Date();
  }

  return prisma.conversation.update({
    where: { id: conversationId },
    data: updateData,
  });
}
