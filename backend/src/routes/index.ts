import { Router } from 'express';
import { authRouter } from './auth.routes';
import { workspaceRouter } from './workspace.routes';
import { agentRouter } from './agent.routes';
import { channelRouter } from './channel.routes';
import { conversationRouter } from './conversation.routes';
import { handoffRouter } from './handoff.routes';
import { analyticsRouter } from './analytics.routes';
import { billingRouter } from './billing.routes';
import { storageRouter } from './storage.routes';
import { webhookRouter } from './webhook.routes';
import { notificationsRouter } from './notifications.routes';

const mainRouter = Router();

mainRouter.use('/auth', authRouter);
mainRouter.use('/workspace', workspaceRouter);
mainRouter.use('/agents', agentRouter);
mainRouter.use('/channels', channelRouter);
mainRouter.use('/conversations', conversationRouter);
mainRouter.use('/handoffs', handoffRouter);
mainRouter.use('/analytics', analyticsRouter);
mainRouter.use('/billing', billingRouter);
mainRouter.use('/storage', storageRouter);
mainRouter.use('/webhooks', webhookRouter);
mainRouter.use('/notifications', notificationsRouter);

export function router(req: any, res: any, next: any) {
  return mainRouter(req, res, next);
}
