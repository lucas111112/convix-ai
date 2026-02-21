import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireWorkspace } from '../middleware/requireWorkspace';
import * as AnalyticsService from '../services/analytics/analytics.service';

const router = Router();

// GET /v1/analytics
// Query params: from, to, agentId?, interval
router.get(
  '/',
  authenticate,
  requireWorkspace,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { from, to, agentId, interval } = req.query as Record<string, string | undefined>;
      const analytics = await AnalyticsService.getAnalytics({
        workspaceId: (req as any).workspace.id,
        from: from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: to ? new Date(to) : new Date(),
        agentId,
        interval: (interval as 'day' | 'week' | 'month') ?? 'day',
      });
      res.json({ analytics });
    } catch (err) {
      next(err);
    }
  },
);

// GET /v1/analytics/credits
router.get(
  '/credits',
  authenticate,
  requireWorkspace,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const credits = await AnalyticsService.getCreditAnalytics((req as any).workspace.id);
      res.json({ credits });
    } catch (err) {
      next(err);
    }
  },
);

// GET /v1/analytics/agents/:agentId
router.get(
  '/agents/:agentId',
  authenticate,
  requireWorkspace,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const analytics = await AnalyticsService.getAgentAnalytics(
        (req as any).workspace.id,
        req.params.agentId as string,
      );
      res.json({ analytics });
    } catch (err) {
      next(err);
    }
  },
);

// GET /v1/analytics/export – streaming CSV export
router.get(
  '/export',
  authenticate,
  requireWorkspace,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { from, to } = req.query as { from: string; to: string };

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="analytics-${from}-to-${to}.csv"`,
      );
      res.write('date,messages,conversations,handoffs,avgLatencyMs,creditsConsumed\n');

      const { prisma } = await import('../config/prisma');
      const rollups = await prisma.analyticsRollup.findMany({
        where: {
          workspaceId: (req as any).workspace.id,
          date: { gte: new Date(from), lte: new Date(to) },
        },
        orderBy: { date: 'asc' },
      });

      for (const row of rollups) {
        res.write(
          `${row.date.toISOString().slice(0, 10)},${row.totalMessages},${row.totalConversations},${row.handoffs},${row.avgLatencyMs},${row.creditsConsumed}\n`,
        );
      }

      res.end();
    } catch (err) {
      next(err);
    }
  },
);

export { router as analyticsRouter };
