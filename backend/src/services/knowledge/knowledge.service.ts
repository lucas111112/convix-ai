import { prisma } from '../../config/prisma';
import { AppError } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { KnowledgeType } from '@prisma/client';

export async function listDocs(agentId: string) {
  return prisma.knowledgeDoc.findMany({
    where: { agentId },
    select: {
      id: true,
      title: true,
      type: true,
      sourceUrl: true,
      status: true,
      chunkCount: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function verifyDocOwnership(
  workspaceId: string,
  agentId: string,
  docId: string,
) {
  const doc = await prisma.knowledgeDoc.findUnique({
    where: { id: docId },
    include: { agent: { select: { workspaceId: true } } },
  });

  if (!doc || doc.agentId !== agentId || doc.agent.workspaceId !== workspaceId) {
    throw new AppError('NOT_FOUND', 404, 'Knowledge document not found');
  }

  return doc;
}

export async function createDoc(
  workspaceId: string,
  agentId: string,
  data: {
    title: string;
    type: KnowledgeType;
    sourceUrl?: string;
    rawContent?: string;
  },
) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { workspaceId: true },
  });

  if (!agent || agent.workspaceId !== workspaceId) {
    throw new AppError('NOT_FOUND', 404, 'Agent not found');
  }

  const doc = await prisma.knowledgeDoc.create({
    data: {
      workspaceId,
      agentId,
      title: data.title,
      type: data.type,
      sourceUrl: data.sourceUrl,
      rawContent: data.rawContent,
      status: 'PENDING',
      chunkCount: 0,
      isActive: true,
    },
  });

  logger.info({ docId: doc.id, agentId, workspaceId }, 'Knowledge doc created, pending ingestion');
  return doc;
}

export async function updateDoc(
  workspaceId: string,
  agentId: string,
  docId: string,
  data: { isActive?: boolean; title?: string },
) {
  await verifyDocOwnership(workspaceId, agentId, docId);

  return prisma.knowledgeDoc.update({
    where: { id: docId },
    data,
  });
}

export async function deleteDoc(
  workspaceId: string,
  agentId: string,
  docId: string,
) {
  await verifyDocOwnership(workspaceId, agentId, docId);

  await prisma.knowledgeDoc.delete({ where: { id: docId } });
  logger.info({ docId, agentId, workspaceId }, 'Knowledge doc deleted');
}

export async function reindexDoc(
  workspaceId: string,
  agentId: string,
  docId: string,
) {
  await verifyDocOwnership(workspaceId, agentId, docId);

  await prisma.knowledgeChunk.deleteMany({ where: { docId } });

  const updated = await prisma.knowledgeDoc.update({
    where: { id: docId },
    data: {
      status: 'PENDING',
      chunkCount: 0,
    },
  });

  logger.info({ docId, agentId, workspaceId }, 'Knowledge doc reset for reindexing');
  return updated;
}
