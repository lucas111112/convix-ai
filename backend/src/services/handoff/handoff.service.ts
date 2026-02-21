import { prisma } from '../../config/prisma';
import { AppError } from '../../lib/errors';
import { logger } from '../../lib/logger';

export async function getHandoffsForConversation(
  workspaceId: string,
  conversationId: string,
) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { workspaceId: true },
  });

  if (!conversation || conversation.workspaceId !== workspaceId) {
    throw new AppError('NOT_FOUND', 404, 'Conversation not found');
  }

  return prisma.handoff.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
  });
}

// Alias used by conversation routes
export const listHandoffsForConversation = getHandoffsForConversation;

export async function triggerManualHandoff(
  workspaceId: string,
  conversationId: string,
  data: { trigger?: string; destination?: string },
) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { workspaceId: true, status: true },
  });

  if (!conversation || conversation.workspaceId !== workspaceId) {
    throw new AppError('NOT_FOUND', 404, 'Conversation not found');
  }

  const handoff = await prisma.handoff.create({
    data: {
      conversationId,
      trigger: (data.trigger as any) ?? 'EXPLICIT_REQUEST',
      destination: (data.destination as any) ?? 'EMAIL_QUEUE',
      summary: 'Manually triggered by operator',
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { status: 'HANDED_OFF' },
  });

  logger.info({ conversationId, workspaceId, handoffId: handoff.id }, 'Manual handoff triggered');
  return handoff;
}

export async function resolveHandoff(
  workspaceId: string,
  handoffId: string,
  data: { learningNote?: string },
) {
  const handoff = await prisma.handoff.findUnique({
    where: { id: handoffId },
    include: {
      conversation: { select: { workspaceId: true } },
    },
  });

  if (!handoff || handoff.conversation.workspaceId !== workspaceId) {
    throw new AppError('NOT_FOUND', 404, 'Handoff not found');
  }

  const updated = await prisma.handoff.update({
    where: { id: handoffId },
    data: {
      resolvedAt: new Date(),
      ...(data.learningNote !== undefined && { learningNote: data.learningNote }),
    },
  });

  logger.info({ handoffId, workspaceId }, 'Handoff resolved');
  return updated;
}
