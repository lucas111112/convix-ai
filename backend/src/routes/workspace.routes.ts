import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { requireWorkspace } from '../middleware/requireWorkspace';
import { validate } from '../middleware/validate';
import { AppError } from '../lib/errors';
import * as WorkspaceService from '../services/workspace/workspace.service';

const router = Router();

/**
 * Role guard middleware – allows only users whose role is in the provided list.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes((req as any).user?.role)) {
      return next(new AppError('FORBIDDEN', 403, 'Insufficient permissions'));
    }
    next();
  };
}

const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
});

// GET /v1/workspace
router.get(
  '/',
  authenticate,
  requireWorkspace,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workspace = await WorkspaceService.getWorkspace((req as any).workspace.id);
      res.json({ workspace });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /v1/workspace
router.patch(
  '/',
  authenticate,
  requireWorkspace,
  requireRole('ADMIN', 'OWNER'),
  validate(updateWorkspaceSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workspace = await WorkspaceService.updateWorkspace(
        (req as any).workspace.id,
        req.body,
      );
      res.json({ workspace });
    } catch (err) {
      next(err);
    }
  },
);

export { router as workspaceRouter };
