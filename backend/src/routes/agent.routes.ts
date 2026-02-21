import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { requireWorkspace } from '../middleware/requireWorkspace';
import { validate } from '../middleware/validate';
import { requireRole } from './workspace.routes';
import { runPipeline, runPipelineStream } from '../services/ai/pipeline.service';
import * as AgentService from '../services/agent/agent.service';
import * as ChannelService from '../services/channel/channel.service';
import * as VoiceAdapter from '../services/channels/adapters/voice.adapter';
import { knowledgeRouter } from './knowledge.routes';

const router = Router();

// ── Schemas ──────────────────────────────────────────────────────────────────

const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  avatar: z.string().optional().default('🤖'),
  systemPrompt: z.string().min(1),
  mode: z.enum(['TEXT', 'VOICE', 'BOTH']).default('TEXT'),
  voiceEnabled: z.boolean().optional().default(false),
  handoffEnabled: z.boolean().optional().default(false),
  handoffThreshold: z.number().min(0).max(1).optional().default(0.65),
  handoffDest: z
    .enum(['NONE', 'LIVE_AGENT', 'ZENDESK', 'FRESHDESK', 'GORGIAS', 'EMAIL_QUEUE'])
    .optional()
    .default('NONE'),
  routingPolicy: z.string().optional(),
  supportEmail: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DRAFT']).optional(),
  taggingEnabled: z.boolean().optional(),
  availableTags: z.array(z.string()).optional(),
  businessHours: z.any().optional(),
});

const updateAgentSchema = createAgentSchema.partial();

// ── Knowledge sub-router ──────────────────────────────────────────────────────
router.use('/:agentId/knowledge', knowledgeRouter);

// ── Agent CRUD ────────────────────────────────────────────────────────────────

// GET /v1/agents
router.get(
  '/',
  authenticate,
  requireWorkspace,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const agents = await AgentService.listAgents((req as any).workspace.id);
      res.json({ agents });
    } catch (err) {
      next(err);
    }
  },
);

// POST /v1/agents
router.post(
  '/',
  authenticate,
  requireWorkspace,
  requireRole('ADMIN', 'OWNER'),
  validate(createAgentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const agent = await AgentService.createAgent((req as any).workspace.id, req.body);
      res.status(201).json({ agent });
    } catch (err) {
      next(err);
    }
  },
);

// GET /v1/agents/:id
router.get(
  '/:id',
  authenticate,
  requireWorkspace,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const agent = await AgentService.getAgent(
        (req as any).workspace.id,
        req.params.id as string,
      );
      res.json({ agent });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /v1/agents/:id
router.patch(
  '/:id',
  authenticate,
  requireWorkspace,
  requireRole('ADMIN', 'OWNER'),
  validate(updateAgentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const agent = await AgentService.updateAgent(
        (req as any).workspace.id,
        req.params.id as string,
        req.body,
      );
      res.json({ agent });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /v1/agents/:id
router.delete(
  '/:id',
  authenticate,
  requireWorkspace,
  requireRole('ADMIN', 'OWNER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await AgentService.deleteAgent((req as any).workspace.id, req.params.id as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ── Chat ─────────────────────────────────────────────────────────────────────

// POST /v1/agents/:id/chat
router.post(
  '/:id/chat',
  authenticate,
  requireWorkspace,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { messages, conversationId, stream, isVoiceCall } = req.body;
      const userMessage = messages[messages.length - 1]?.content ?? '';

      const inbound = {
        workspaceId: (req as any).workspace.id,
        agentId: req.params.id as string,
        channelType: 'WEB',
        externalId: conversationId ?? `web-${Date.now()}`,
        customerId: (req as any).user.id,
        customerName: (req as any).user.name,
        content: userMessage,
        isVoiceCall: Boolean(isVoiceCall),
      };

      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        await runPipelineStream(inbound, (delta: string) => {
          res.write(
            `data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`,
          );
        });

        res.write('data: [DONE]\n\n');
        res.end();
      } else {
        const result = await runPipeline(inbound);
        res.json(result);
      }
    } catch (err) {
      next(err);
    }
  },
);

// ── Voice ─────────────────────────────────────────────────────────────────────

// POST /v1/agents/:id/voice – initiate outbound voice call
router.post(
  '/:id/voice',
  authenticate,
  requireWorkspace,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { to } = req.body;
      const agentId = req.params.id as string;
      const workspace = (req as any).workspace;
      const creds = await ChannelService.getDecryptedCredentials(workspace.id, 'VOICE');
      await VoiceAdapter.initiateOutboundCall(to, agentId, workspace.slug, creds);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

// ── Agent Channel Management ──────────────────────────────────────────────────

// GET /v1/agents/:agentId/channels – list channel connection status for this agent
router.get(
  '/:agentId/channels',
  authenticate,
  requireWorkspace,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const channels = await AgentService.getAgentChannels(
        (req as any).workspace.id,
        req.params.agentId as string,
      );
      res.json({ channels });
    } catch (err) {
      next(err);
    }
  },
);

// PUT /v1/agents/:agentId/channels/:channelType – connect (upsert) a channel + link agent
router.put(
  '/:agentId/channels/:channelType',
  authenticate,
  requireWorkspace,
  requireRole('ADMIN', 'OWNER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const channel = await AgentService.connectAgentChannel(
        (req as any).workspace.id,
        req.params.agentId as string,
        req.params.channelType as string,
        req.body,
      );
      res.json({ channel });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /v1/agents/:agentId/channels/:channelType – disconnect channel from agent
router.delete(
  '/:agentId/channels/:channelType',
  authenticate,
  requireWorkspace,
  requireRole('ADMIN', 'OWNER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await AgentService.disconnectAgentChannel(
        (req as any).workspace.id,
        req.params.agentId as string,
        req.params.channelType as string,
      );
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

// ── Widget ───────────────────────────────────────────────────────────────────

// GET /v1/agents/:agentId/widget
router.get(
  '/:agentId/widget',
  authenticate,
  requireWorkspace,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await ChannelService.getWidgetConfig(req.params.agentId as string);
      res.json({ config });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /v1/agents/:agentId/widget
router.patch(
  '/:agentId/widget',
  authenticate,
  requireWorkspace,
  requireRole('ADMIN', 'OWNER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await ChannelService.updateWidgetConfig(
        (req as any).workspace.id,
        req.params.agentId as string,
        req.body,
      );
      res.json({ config });
    } catch (err) {
      next(err);
    }
  },
);

export { router as agentRouter };
