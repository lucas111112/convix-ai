import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireWorkspace } from '../middleware/requireWorkspace';
import { requireRole } from './workspace.routes';
import * as BillingService from '../services/billing/billing.service';

const router = Router();

// GET /v1/billing/plans
router.get(
  '/plans',
  authenticate,
  requireWorkspace,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const plans = await BillingService.getPlanCatalogue();
      res.json({ plans });
    } catch (err) {
      next(err);
    }
  },
);

// GET /v1/billing/invoices
router.get(
  '/invoices',
  authenticate,
  requireWorkspace,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invoices = await BillingService.getInvoices((req as any).workspace.id);
      res.json({ invoices });
    } catch (err) {
      next(err);
    }
  },
);

// POST /v1/billing/portal – OWNER only; returns Stripe portal URL
router.post(
  '/portal',
  authenticate,
  requireWorkspace,
  requireRole('OWNER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const url = await BillingService.createPortalSession((req as any).workspace.id);
      res.json({ url });
    } catch (err) {
      next(err);
    }
  },
);

// POST /v1/billing/checkout – returns Stripe checkout session URL
router.post(
  '/checkout',
  authenticate,
  requireWorkspace,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const url = await BillingService.createCheckoutSession(
        (req as any).workspace.id,
        req.body?.priceId ?? req.body,
      );
      res.json({ url });
    } catch (err) {
      next(err);
    }
  },
);

export { router as billingRouter };
