# Billing & Credits

## Overview

Axon AI uses a **credit-based consumption model** on top of a subscription plan. The plan determines the monthly credit grant and feature limits. Credits are consumed per operation.

## Plans

| Plan | Price | Monthly Credits | Agents | Channels |
|---|---|---|---|---|
| `STARTER` | $0 | 500 | 1 | Web only |
| `BUILDER` | $49 | 10,000 | 5 | All |
| `PRO` | $149 | 50,000 | 20 | All |
| `ENTERPRISE` | Custom | Custom | Unlimited | All + SLA |

## Credit Costs

| Operation | Cost |
|---|---|
| Text message (AI response) | 1 credit |
| Voice call (per minute) | 5 credits |
| Auto-tagging (per conversation) | 2 credits |

---

## Credit Ledger

Every credit change — grant, consumption, top-up, refund — is an immutable append-only row in `credit_ledger`. The current balance is the sum of all `delta` values.

```ts
// services/billing/credit.service.ts

async function getBalance(workspaceId: string): Promise<number> {
  // Cache in Redis for 60s — avoids a DB hit on every message
  const cacheKey = `credits:${workspaceId}`;
  const cached = await redis.get(cacheKey);
  if (cached !== null) return parseInt(cached, 10);

  const result = await prisma.creditLedger.aggregate({
    where: { workspaceId },
    _sum: { delta: true },
  });

  const balance = result._sum.delta ?? 0;
  await redis.setex(cacheKey, 60, String(balance));
  return balance;
}

async function deductCredits(
  workspaceId: string,
  amount: number,
  reason: CreditReason,
  refId?: string
): Promise<void> {
  const balance = await getBalance(workspaceId);
  if (balance < amount) {
    throw new AppError('INSUFFICIENT_CREDITS', 402, `Need ${amount} credits, have ${balance}`);
  }

  await prisma.creditLedger.create({
    data: {
      workspaceId,
      delta: -amount,
      reason,
      refId,
      balance: balance - amount,
    },
  });

  // Invalidate balance cache
  await redis.del(`credits:${workspaceId}`);
}

async function grantCredits(
  workspaceId: string,
  amount: number,
  reason: CreditReason,
  refId?: string
): Promise<void> {
  const balance = await getBalance(workspaceId);
  await prisma.creditLedger.create({
    data: {
      workspaceId,
      delta: amount,
      reason,
      refId,
      balance: balance + amount,
    },
  });
  await redis.del(`credits:${workspaceId}`);
}
```

---

## Monthly Credit Grant

On the 1st of each month (BullMQ repeatable job), every workspace gets their plan's monthly credit grant:

```ts
// queues/workers/rollup.worker.ts (or a dedicated billing worker)
async function grantMonthlyCredits(): Promise<void> {
  const workspaces = await prisma.workspace.findMany({
    where: { plan: { not: 'ENTERPRISE' } },
    select: { id: true, plan: true },
  });

  const planCredits: Record<Plan, number> = {
    STARTER: 500,
    BUILDER: 10_000,
    PRO: 50_000,
    ENTERPRISE: 0,  // granted manually
  };

  await Promise.all(
    workspaces.map(ws =>
      CreditService.grantCredits(ws.id, planCredits[ws.plan], 'PLAN_GRANT')
    )
  );
}
```

---

## Stripe Integration

Stripe handles payment collection. Axon AI never touches raw card data.

### Subscription Flow

```
1. User clicks "Upgrade to Builder" in dashboard
2. Frontend calls POST /v1/billing/checkout
3. Backend creates Stripe Checkout Session
4. Frontend redirects to Stripe-hosted checkout page
5. User enters card details on Stripe
6. Stripe redirects back to /dashboard/billing?success=true
7. Stripe sends webhook event: checkout.session.completed
8. Backend updates workspace.plan + grants credits
```

### Creating Checkout Session

```ts
async function createCheckoutSession(
  workspaceId: string,
  priceId: string  // Stripe Price ID for the selected plan
): Promise<string> {
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });

  let customerId = workspace.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { workspaceId },
    });
    customerId = customer.id;
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { stripeCustomerId: customerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${env.FRONTEND_URL}/dashboard/billing?success=true`,
    cancel_url: `${env.FRONTEND_URL}/dashboard/billing`,
    metadata: { workspaceId },
  });

  return session.url!;
}
```

### Stripe Webhook Handler

```ts
// POST /v1/webhooks/stripe (no auth middleware — verified by Stripe signature)
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']!;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return res.sendStatus(400);
  }

  res.sendStatus(200);  // Acknowledge immediately

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutComplete(event.data.object as Stripe.CheckoutSession);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;
  }
});

async function handleCheckoutComplete(session: Stripe.CheckoutSession): Promise<void> {
  const workspaceId = session.metadata!.workspaceId;
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  const priceId = subscription.items.data[0].price.id;

  const plan = PRICE_TO_PLAN[priceId];  // map Stripe Price IDs to Plan enum
  if (!plan) return;

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { plan },
  });

  // Grant this month's credits immediately
  const planCredits = { BUILDER: 10_000, PRO: 50_000 }[plan] ?? 0;
  if (planCredits > 0) {
    await CreditService.grantCredits(workspaceId, planCredits, 'PLAN_GRANT', session.id);
  }
}

async function handleSubscriptionCancelled(sub: Stripe.Subscription): Promise<void> {
  const customer = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer;
  const workspaceId = customer.metadata.workspaceId;
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { plan: 'STARTER' },
  });
}
```

---

## Customer Portal

```ts
async function createPortalSession(workspaceId: string): Promise<string> {
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  if (!workspace.stripeCustomerId) throw new AppError('NO_BILLING_ACCOUNT', 400);

  const session = await stripe.billingPortal.sessions.create({
    customer: workspace.stripeCustomerId,
    return_url: `${env.FRONTEND_URL}/dashboard/billing`,
  });

  return session.url;
}
```

---

## Plan Enforcement

Before creating a new agent, check the plan limit:

```ts
async function enforceAgentLimit(workspaceId: string): Promise<void> {
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    include: { _count: { select: { agents: true } } },
  });

  const limits = { STARTER: 1, BUILDER: 5, PRO: 20, ENTERPRISE: Infinity };
  const limit = limits[workspace.plan];

  if (workspace._count.agents >= limit) {
    throw new AppError(
      'AGENT_LIMIT_REACHED',
      402,
      `Your ${workspace.plan} plan supports up to ${limit} agent(s). Upgrade to add more.`
    );
  }
}
```

---

## Credit Top-Up Packs (One-Time Purchases)

Users can buy additional credits without upgrading their plan:

```ts
const CREDIT_PACKS = [
  { credits: 2_000,  priceId: 'price_topup_2k',  price: 9 },
  { credits: 10_000, priceId: 'price_topup_10k', price: 39 },
  { credits: 50_000, priceId: 'price_topup_50k', price: 179 },
];
```

Handled via Stripe Checkout in `payment_intent` mode (not subscription). On `payment_intent.succeeded` webhook, grant credits with `reason: 'TOPUP_PURCHASE'`.

---

## Low Credit Warning

When balance drops below 10% of the monthly grant, send an email warning:

```ts
async function checkLowCredits(workspaceId: string): Promise<void> {
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  const balance = await CreditService.getBalance(workspaceId);
  const monthlyGrant = { STARTER: 500, BUILDER: 10_000, PRO: 50_000, ENTERPRISE: 0 }[workspace.plan];
  const threshold = monthlyGrant * 0.1;

  if (balance > 0 && balance <= threshold) {
    // Only send once per day (check Redis flag)
    const flagKey = `low_credit_warning:${workspaceId}:${today()}`;
    if (await redis.exists(flagKey)) return;

    await resend.emails.send({
      from: env.RESEND_FROM,
      to: workspace.adminEmail,
      subject: `[Axon AI] Low credit balance: ${balance} credits remaining`,
      html: `<p>Your workspace is running low on credits (${balance} remaining). <a href="${env.FRONTEND_URL}/dashboard/billing">Top up or upgrade here.</a></p>`,
    });

    await redis.setex(flagKey, 86400, '1');
  }
}
```
