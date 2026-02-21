import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../lib/errors';

export async function requireWorkspace(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('UNAUTHORIZED', 401, 'Authentication required');
    }

    // Get workspaceId from params, headers, or JWT payload
    const workspaceId =
      (req.params.workspaceId as string) ||
      (req.headers['x-workspace-id'] as string) ||
      req.user.workspaceId;

    if (!workspaceId) {
      throw new AppError('WORKSPACE_NOT_FOUND', 404, 'No workspace specified');
    }

    // Verify user is a member of this workspace
    const member = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: req.user.id,
          workspaceId,
        },
      },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true, plan: true },
        },
      },
    });

    if (!member) {
      throw new AppError('FORBIDDEN', 403, 'You do not have access to this workspace');
    }

    req.workspace = {
      id: member.workspace.id,
      name: member.workspace.name,
      slug: member.workspace.slug,
      plan: member.workspace.plan,
    };
    // Update user role from workspace membership
    req.user.role = member.role;

    next();
  } catch (err) {
    next(err);
  }
}
