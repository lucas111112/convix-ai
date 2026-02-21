import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireWorkspace } from '../middleware/requireWorkspace';
import { prisma } from '../config/prisma';

const router = Router();

// GET /v1/notifications
// Returns recent actionable notifications derived from conversations and handoffs.
// - HANDED_OFF conversations from the last 7 days
// - New OPEN conversations from the last 2 hours
router.get(
  '/',
  authenticate,
  requireWorkspace,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workspaceId = (req as any).workspace.id;
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      // Fetch HANDED_OFF conversations (high priority — need human attention)
      const handoffConvs = await prisma.conversation.findMany({
        where: {
          workspaceId,
          status: 'HANDED_OFF',
          updatedAt: { gte: sevenDaysAgo },
        },
        include: { agent: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      });

      // Fetch recent OPEN conversations (last 2 hours)
      const newConvs = await prisma.conversation.findMany({
        where: {
          workspaceId,
          status: 'OPEN',
          createdAt: { gte: twoHoursAgo },
        },
        include: { agent: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      type NotificationItem = {
        id: string;
        type: string;
        title: string;
        description: string;
        conversationId: string;
        agentName: string;
        customerName: string | null;
        createdAt: Date;
      };

      const items: NotificationItem[] = [
        ...handoffConvs.map((c) => ({
          id: `handoff-${c.id}`,
          type: 'handoff' as const,
          title: 'Handoff requested',
          description: `${c.customerName ?? 'A customer'} needs human assistance`,
          conversationId: c.id,
          agentName: c.agent.name,
          customerName: c.customerName,
          createdAt: c.updatedAt,
        })),
        ...newConvs.map((c) => ({
          id: `new-${c.id}`,
          type: 'new_conversation' as const,
          title: 'New conversation',
          description: `${c.customerName ?? 'A customer'} started a chat with ${c.agent.name}`,
          conversationId: c.id,
          agentName: c.agent.name,
          customerName: c.customerName,
          createdAt: c.createdAt,
        })),
      ];

      // Deduplicate by conversationId (handoff takes precedence over new_conversation)
      const seen = new Set<string>();
      const deduplicated = items
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .filter((item) => {
          if (seen.has(item.conversationId)) return false;
          seen.add(item.conversationId);
          return true;
        })
        .slice(0, 15);

      res.json({ count: deduplicated.length, items: deduplicated });
    } catch (err) {
      next(err);
    }
  },
);

export { router as notificationsRouter };
