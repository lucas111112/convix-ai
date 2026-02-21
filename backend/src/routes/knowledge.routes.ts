import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireWorkspace } from '../middleware/requireWorkspace';
import { requireRole } from './workspace.routes';
import { ingestionQueue } from '../queues/queue';
import * as KnowledgeService from '../services/knowledge/knowledge.service';

// mergeParams: true so /:agentId is available from the parent agent router
const router = Router({ mergeParams: true });

// GET /v1/agents/:agentId/knowledge
router.get(
  '/',
  authenticate,
  requireWorkspace,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const docs = await KnowledgeService.listDocs(req.params.agentId as string);
      res.json({ docs });
    } catch (err) {
      next(err);
    }
  },
);

// POST /v1/agents/:agentId/knowledge
router.post(
  '/',
  authenticate,
  requireWorkspace,
  requireRole('ADMIN', 'OWNER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doc = await KnowledgeService.createDoc(
        (req as any).workspace.id,
        req.params.agentId as string,
        req.body,
      );
      await ingestionQueue.add('ingest', { docId: doc.id }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      });
      res.status(201).json({ doc });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /v1/agents/:agentId/knowledge/:id
router.patch(
  '/:id',
  authenticate,
  requireWorkspace,
  requireRole('ADMIN', 'OWNER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doc = await KnowledgeService.updateDoc(
        (req as any).workspace.id,
        req.params.agentId as string,
        req.params.id as string,
        req.body,
      );
      res.json({ doc });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /v1/agents/:agentId/knowledge/:id
router.delete(
  '/:id',
  authenticate,
  requireWorkspace,
  requireRole('ADMIN', 'OWNER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await KnowledgeService.deleteDoc(
        (req as any).workspace.id,
        req.params.agentId as string,
        req.params.id as string,
      );
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// POST /v1/agents/:agentId/knowledge/:id/reindex
router.post(
  '/:id/reindex',
  authenticate,
  requireWorkspace,
  requireRole('ADMIN', 'OWNER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doc = await KnowledgeService.reindexDoc(
        (req as any).workspace.id,
        req.params.agentId as string,
        req.params.id as string,
      );
      await ingestionQueue.add('ingest', { docId: doc.id }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      });
      res.json({ doc });
    } catch (err) {
      next(err);
    }
  },
);

export { router as knowledgeRouter };
