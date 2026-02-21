import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireWorkspace } from '../middleware/requireWorkspace';
import * as HandoffService from '../services/handoff/handoff.service';

const router = Router();

// PATCH /v1/handoffs/:id – resolve a handoff
router.patch(
  '/:id',
  authenticate,
  requireWorkspace,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const handoff = await HandoffService.resolveHandoff(
        (req as any).workspace.id,
        req.params.id as string,
        req.body,
      );
      res.json({ handoff });
    } catch (err) {
      next(err);
    }
  },
);

export { router as handoffRouter };
