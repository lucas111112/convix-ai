import { prisma } from '../../config/prisma';
import { logger } from '../../lib/logger';
import { AppError } from '../../lib/errors';
import { runPipeline, type InboundMessage } from '../ai/pipeline.service';

// ─────────────────────────────────────────────────────────────────
// Main dispatcher
// ─────────────────────────────────────────────────────────────────

/**
 * Validates the inbound message context (agent active, channel enabled),
 * runs the AI pipeline, and returns the AI reply with conversation ID.
 */
export async function dispatch(
  inbound: InboundMessage,
): Promise<{ content: string; conversationId: string }> {
  // 1. Verify agent exists and is active
  const agent = await prisma.agent.findUnique({
    where: { id: inbound.agentId },
    include: {
      channels: {
        include: { channel: true },
        where: { isActive: true },
      },
    },
  });

  if (!agent) {
    throw new AppError('AGENT_NOT_FOUND', 404, `Agent ${inbound.agentId} not found`);
  }

  if (agent.status !== 'ACTIVE') {
    throw new AppError(
      'AGENT_INACTIVE',
      422,
      `Agent ${agent.name} is not active (status: ${agent.status})`,
    );
  }

  // 2. Verify this channel type is enabled for the agent
  const channelEnabled = agent.channels.some(
    (ac) =>
      ac.channel.type === inbound.channelType &&
      ac.channel.isActive &&
      ac.isActive,
  );

  if (!channelEnabled) {
    logger.warn(
      { agentId: agent.id, channelType: inbound.channelType },
      'Channel not enabled for agent, silently dropping message',
    );
    throw new AppError(
      'CHANNEL_NOT_ENABLED',
      422,
      `Channel ${inbound.channelType} is not enabled for agent ${agent.name}`,
    );
  }

  // 3. Run the AI pipeline
  const result = await runPipeline(inbound);

  return {
    content: result.message.content,
    conversationId: result.conversationId,
  };
}

// ─────────────────────────────────────────────────────────────────
// Workspace + agent resolver (used by webhook routes)
// ─────────────────────────────────────────────────────────────────

/**
 * Resolves workspaceId and agentId from a workspace slug and channel type.
 * Throws 404 if no active workspace/agent/channel combination is found.
 */
export async function resolveFromSlug(
  slug: string,
  channelType: string,
): Promise<{ workspaceId: string; agentId: string }> {
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
  });

  if (!workspace) {
    throw new AppError('WORKSPACE_NOT_FOUND', 404, `Workspace with slug "${slug}" not found`);
  }

  // Find the first active agent that has this channel enabled
  const agentChannel = await prisma.agentChannel.findFirst({
    where: {
      isActive: true,
      agent: {
        workspaceId: workspace.id,
        status: 'ACTIVE',
      },
      channel: {
        workspaceId: workspace.id,
        type: channelType as any,
        isActive: true,
      },
    },
    include: {
      agent: { select: { id: true } },
    },
    orderBy: { agent: { createdAt: 'asc' } },
  });

  if (!agentChannel) {
    throw new AppError(
      'NO_ACTIVE_AGENT',
      404,
      `No active agent with ${channelType} channel found for workspace "${slug}"`,
    );
  }

  return {
    workspaceId: workspace.id,
    agentId: agentChannel.agent.id,
  };
}
