import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireWorkspace } from '../middleware/requireWorkspace';
import * as ConversationService from '../services/conversation/conversation.service';
import * as HandoffService from '../services/handoff/handoff.service';
import { ChannelType, ConversationStatus } from '@prisma/client';

const router = Router();

// GET /v1/conversations
// Query params: agentId, status, channelType, from, to, limit, cursor
router.get(
  '/',
  authenticate,
  requireWorkspace,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { agentId, status, channelType, from, to, limit, cursor } = req.query as Record<
        string,
        string | undefined
      >;

      const result = await ConversationService.listConversations((req as any).workspace.id, {
        agentId,
        status: status as ConversationStatus | undefined,
        channelType: channelType as ChannelType | undefined,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        cursor,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /v1/conversations/:id
router.get(
  '/:id',
  authenticate,
  requireWorkspace,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const conversation = await ConversationService.getConversation(
        (req as any).workspace.id,
        req.params.id as string,
      );
      res.json({ conversation });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /v1/conversations/:id
router.patch(
  '/:id',
  authenticate,
  requireWorkspace,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const conversation = await ConversationService.updateConversation(
        (req as any).workspace.id,
        req.params.id as string,
        req.body,
      );
      res.json({ conversation });
    } catch (err) {
      next(err);
    }
  },
);

// POST /v1/conversations/:id/handoff – manual handoff trigger
router.post(
  '/:id/handoff',
  authenticate,
  requireWorkspace,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const handoff = await HandoffService.triggerManualHandoff(
        (req as any).workspace.id,
        req.params.id as string,
        req.body,
      );
      res.status(201).json({ handoff });
    } catch (err) {
      next(err);
    }
  },
);

// GET /v1/conversations/:id/handoffs – list handoffs for a conversation
router.get(
  '/:id/handoffs',
  authenticate,
  requireWorkspace,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const handoffs = await HandoffService.listHandoffsForConversation(
        (req as any).workspace.id,
        req.params.id as string,
      );
      res.json({ handoffs });
    } catch (err) {
      next(err);
    }
  },
);

export { router as conversationRouter };
