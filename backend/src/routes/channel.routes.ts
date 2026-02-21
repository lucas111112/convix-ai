import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { requireWorkspace } from '../middleware/requireWorkspace';
import { validate } from '../middleware/validate';
import { requireRole } from './workspace.routes';
import * as ChannelService from '../services/channel/channel.service';
import { sendMessage } from '../services/channels/sender';
import { ChannelType } from '@prisma/client';

const router = Router();

// ── Schemas ──────────────────────────────────────────────────────────────────

const upsertChannelSchema = z.object({
  isActive: z.boolean(),
  credentials: z.record(z.string()).optional(),
});

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /v1/channels
router.get(
  '/',
  authenticate,
  requireWorkspace,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const channels = await ChannelService.listChannels((req as any).workspace.id);
      res.json({ channels });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /v1/channels/:type
router.put(
  '/:type',
  authenticate,
  requireWorkspace,
  requireRole('ADMIN', 'OWNER'),
  validate(upsertChannelSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const channel = await ChannelService.upsertChannel(
        (req as any).workspace.id,
        req.params.type as ChannelType,
        req.body,
      );
      res.json({ channel });
    } catch (err) {
      next(err);
    }
  },
);

// POST /v1/channels/:type/test
// Body: { to: string } – the recipient (phone number, chat ID, email, etc.)
router.post(
  '/:type/test',
  authenticate,
  requireWorkspace,
  requireRole('ADMIN', 'OWNER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { to } = req.body;
      if (!to) {
        res.status(400).json({ error: 'Recipient "to" is required in the request body' });
        return;
      }

      await sendMessage(
        req.params.type as string,
        to,
        'This is a test message from Axon AI. Your channel is configured correctly. ✓',
        (req as any).workspace.id,
      );

      res.json({ success: true, message: 'Test message sent successfully' });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /v1/agents/:agentId/channels/:channelId – enable a channel for an agent
// Defined here in the channel router to keep all channel logic together.
// The main router mounts this file at /channels, so we export a second handler
// and the index will also mount it at the right prefix, OR we handle it directly
// in the agent router.  To keep this self-contained without cross-mounting
// we expose a plain handler that agent.routes.ts can register:
export async function enableAgentChannelHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await ChannelService.enableAgentChannel(
      (req as any).workspace.id,
      req.params.agentId as string,
      req.params.channelId as string,
      req.body,
    );
    res.json({ result });
  } catch (err) {
    next(err);
  }
}

export { router as channelRouter };
