import Stripe from 'stripe';
import { prisma } from '../../config/prisma';
import { AppError } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { env } from '../../config/env';
import { Plan } from '@prisma/client';
import { grantCredits } from './credit.service';

// Lazy Stripe initialisation – avoids throwing at module load when key is absent
let _stripe: Stripe | null = null;
function stripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(env.STRIPE_SECRET_KEY ?? '', {
      apiVersion: '2024-12-18.acacia' as any,
    });
  }
  return _stripe;
}

const PRICE_TO_PLAN: Record<string, Plan> = {
  ...(env.STRIPE_BUILDER_PRICE_ID ? { [env.STRIPE_BUILDER_PRICE_ID]: 'BUILDER' as Plan } : {}),
  ...(env.STRIPE_PRO_PRICE_ID ? { [env.STRIPE_PRO_PRICE_ID]: 'PRO' as Plan } : {}),
};

const PLAN_CATALOGUE = [
  {
    id: 'STARTER',
    name: 'Starter',
    price: 0,
    currency: 'usd',
    interval: null,
    agents: 1,
    credits: 500,
    features: ['1 AI agent', '500 monthly credits', 'Web channel', 'Basic analytics'],
  },
  {
    id: 'BUILDER',
    name: 'Builder',
    priceId: env.STRIPE_BUILDER_PRICE_ID || undefined,
    price: 49,
    currency: 'usd',
    interval: 'month',
    agents: 5,
    credits: 10000,
    features: ['5 AI agents', '10,000 monthly credits', 'All channels', 'Advanced analytics', 'Priority support'],
  },
  {
    id: 'PRO',
    name: 'Pro',
    priceId: env.STRIPE_PRO_PRICE_ID || undefined,
    price: 149,
    currency: 'usd',
    interval: 'month',
    agents: 20,
    credits: 50000,
    features: ['20 AI agents', '50,000 monthly credits', 'All channels', 'Full analytics', 'Dedicated support', 'Custom integrations'],
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    price: null,
    currency: 'usd',
    interval: null,
    agents: -1,
    credits: -1,
    features: ['Unlimited agents', 'Unlimited credits', 'All channels', 'Full analytics', 'SLA guarantee', 'Custom contract'],
  },
];

export async function getPlanCatalogue() {
  return PLAN_CATALOGUE;
}

async function getOrCreateStripeCustomer(workspaceId: string): Promise<string> {
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    include: {
      members: {
        where: { role: 'OWNER' },
        include: { user: { select: { email: true, name: true } } },
        take: 1,
      },
    },
  });

  if (workspace.stripeCustomerId) {
    return workspace.stripeCustomerId;
  }

  const ownerEmail = workspace.members[0]?.user?.email;
  const ownerName = workspace.members[0]?.user?.name;

  const customer = await stripe().customers.create({
    email: ownerEmail,
    name: ownerName ?? workspace.name,
    metadata: { workspaceId },
  });

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

export async function getInvoices(workspaceId: string) {
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: { stripeCustomerId: true },
  });

  if (!workspace.stripeCustomerId) {
    return [];
  }

  const invoices = await stripe().invoices.list({
    customer: workspace.stripeCustomerId,
    limit: 24,
  });

  return invoices.data.map((inv) => ({
    id: inv.id,
    number: inv.number,
    status: inv.status,
    amount: inv.amount_paid,
    currency: inv.currency,
    created: new Date(inv.created * 1000),
    periodStart: new Date((inv.period_start ?? inv.created) * 1000),
    periodEnd: new Date((inv.period_end ?? inv.created) * 1000),
    hostedUrl: inv.hosted_invoice_url,
    pdfUrl: inv.invoice_pdf,
  }));
}

export async function createPortalSession(workspaceId: string): Promise<string> {
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: { stripeCustomerId: true },
  });

  if (!workspace.stripeCustomerId) {
    throw new AppError(
      'NO_BILLING_ACCOUNT',
      400,
      'No billing account found. Please subscribe to a plan first.',
    );
  }

  const session = await stripe().billingPortal.sessions.create({
    customer: workspace.stripeCustomerId,
    return_url: `${env.FRONTEND_URL}/dashboard/billing`,
  });

  return session.url;
}

export async function createCheckoutSession(
  workspaceId: string,
  priceId: string,
): Promise<string> {
  const customerId = await getOrCreateStripeCustomer(workspaceId);

  const session = await stripe().checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${env.FRONTEND_URL}/dashboard/billing?checkout=success`,
    cancel_url: `${env.FRONTEND_URL}/dashboard/billing?checkout=cancelled`,
    metadata: { workspaceId },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
  });

  return session.url!;
}

export async function handleCheckoutComplete(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const workspaceId = session.metadata?.workspaceId;
  if (!workspaceId) {
    logger.warn({ sessionId: session.id }, 'Checkout session missing workspaceId metadata');
    return;
  }

  const subscriptionId = session.subscription as string;
  if (!subscriptionId) return;

  const subscription = await stripe().subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price.id;
  const plan = priceId ? PRICE_TO_PLAN[priceId] : undefined;

  if (!plan) {
    logger.warn({ priceId, workspaceId }, 'Unknown price ID in checkout session');
    return;
  }

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { plan },
  });

  logger.info({ workspaceId, plan, subscriptionId }, 'Checkout complete, plan updated');
}

export async function handleSubscriptionUpdate(
  sub: Stripe.Subscription,
): Promise<void> {
  const workspace = await prisma.workspace.findFirst({
    where: { stripeCustomerId: sub.customer as string },
    select: { id: true },
  });

  if (!workspace) {
    logger.warn({ customerId: sub.customer }, 'Subscription update: workspace not found');
    return;
  }

  const priceId = sub.items.data[0]?.price.id;
  const plan = priceId ? PRICE_TO_PLAN[priceId] : undefined;

  if (!plan) {
    logger.warn({ priceId }, 'Unknown price ID in subscription update');
    return;
  }

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: { plan },
  });

  logger.info({ workspaceId: workspace.id, plan }, 'Subscription updated');
}

export async function handleSubscriptionCancelled(
  sub: Stripe.Subscription,
): Promise<void> {
  const workspace = await prisma.workspace.findFirst({
    where: { stripeCustomerId: sub.customer as string },
    select: { id: true },
  });

  if (!workspace) {
    logger.warn({ customerId: sub.customer }, 'Subscription cancelled: workspace not found');
    return;
  }

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: { plan: 'STARTER' },
  });

  logger.info({ workspaceId: workspace.id }, 'Subscription cancelled, downgraded to STARTER');
}

export async function handlePaymentFailed(
  invoice: Stripe.Invoice,
): Promise<void> {
  const workspace = await prisma.workspace.findFirst({
    where: { stripeCustomerId: invoice.customer as string },
    select: { id: true },
  });

  if (!workspace) {
    logger.warn({ customerId: invoice.customer }, 'Payment failed: workspace not found');
    return;
  }

  logger.warn(
    { workspaceId: workspace.id, invoiceId: invoice.id, amount: invoice.amount_due },
    'Payment failed for workspace',
  );
}
