import { prisma } from '../../config/prisma';
import { AppError } from '../../lib/errors';
import { getBalance } from '../billing/credit.service';

export async function getWorkspace(workspaceId: string) {
  const [workspace, creditBalance] = await Promise.all([
    prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      include: { _count: { select: { members: true } } },
    }),
    getBalance(workspaceId),
  ]);
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    plan: workspace.plan,
    creditBalance,
    memberCount: workspace._count.members,
  };
}

export async function updateWorkspace(workspaceId: string, name: string) {
  return prisma.workspace.update({
    where: { id: workspaceId },
    data: { name },
    select: { id: true, name: true, slug: true, plan: true },
  });
}
