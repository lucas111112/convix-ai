# Project Structure

```
backend/
├── src/
│   ├── index.ts                  # Entry point — creates app, binds Socket.io, starts server
│   ├── app.ts                    # Express app factory (middleware stack, router mount)
│   │
│   ├── config/
│   │   ├── env.ts                # Zod-validated env schema — throws on bad config at boot
│   │   ├── openai.ts             # OpenAI SDK singleton
│   │   ├── redis.ts              # Redis client singleton (ioredis)
│   │   └── prisma.ts             # Prisma client singleton
│   │
│   ├── middleware/
│   │   ├── authenticate.ts       # Verify JWT, attach req.user
│   │   ├── requireWorkspace.ts   # Resolve workspace from req.user, attach req.workspace
│   │   ├── rateLimiter.ts        # Per-IP + per-user sliding window limits
│   │   ├── errorHandler.ts       # Catch-all Express error handler → JSON error shape
│   │   ├── notFound.ts           # 404 handler
│   │   └── validate.ts           # Zod schema validator factory
│   │
│   ├── routes/
│   │   ├── index.ts              # Mount all routers under /v1
│   │   ├── auth.routes.ts
│   │   ├── workspace.routes.ts
│   │   ├── agents.routes.ts
│   │   ├── conversations.routes.ts
│   │   ├── knowledge.routes.ts
│   │   ├── channels.routes.ts
│   │   ├── webhooks.routes.ts    # Inbound channel webhooks (no auth middleware)
│   │   ├── analytics.routes.ts
│   │   ├── billing.routes.ts
│   │   ├── widget.routes.ts
│   │   └── handoff.routes.ts
│   │
│   ├── services/
│   │   ├── auth/
│   │   │   ├── auth.service.ts   # register, login, refresh, logout
│   │   │   └── token.service.ts  # sign, verify, rotate refresh tokens
│   │   │
│   │   ├── agent/
│   │   │   ├── agent.service.ts  # CRUD for agents
│   │   │   └── agent.schema.ts   # Zod schemas for agent payloads
│   │   │
│   │   ├── ai/
│   │   │   ├── pipeline.service.ts    # Orchestrates RAG + completion + scoring
│   │   │   ├── rag.service.ts         # Embed query, vector search, chunk retrieval
│   │   │   ├── completion.service.ts  # GPT-4o chat completion (streaming + non-streaming)
│   │   │   ├── confidence.service.ts  # Composite confidence score computation
│   │   │   ├── embed.service.ts       # text-embedding-3-small wrapper + caching
│   │   │   └── prompt.service.ts      # Build final prompt from parts
│   │   │
│   │   ├── knowledge/
│   │   │   ├── knowledge.service.ts   # CRUD + ingest trigger
│   │   │   ├── ingestion/
│   │   │   │   ├── text.ingestor.ts
│   │   │   │   ├── url.ingestor.ts
│   │   │   │   ├── pdf.ingestor.ts
│   │   │   │   ├── qa.ingestor.ts
│   │   │   │   ├── youtube.ingestor.ts
│   │   │   │   └── sitemap.ingestor.ts
│   │   │   └── chunker.ts             # Sliding-window text chunker
│   │   │
│   │   ├── channel/
│   │   │   ├── channel.service.ts     # CRUD + credential encryption/decryption
│   │   │   ├── dispatcher.ts          # Route inbound message → agent pipeline
│   │   │   ├── adapters/
│   │   │   │   ├── web.adapter.ts
│   │   │   │   ├── whatsapp.adapter.ts
│   │   │   │   ├── telegram.adapter.ts
│   │   │   │   ├── messenger.adapter.ts
│   │   │   │   ├── slack.adapter.ts
│   │   │   │   ├── sms.adapter.ts
│   │   │   │   ├── voice.adapter.ts
│   │   │   │   └── email.adapter.ts
│   │   │   └── sender.ts              # Unified outbound send (picks adapter by channel)
│   │   │
│   │   ├── conversation/
│   │   │   ├── conversation.service.ts
│   │   │   └── message.service.ts
│   │   │
│   │   ├── handoff/
│   │   │   ├── handoff.service.ts     # Trigger, create handoff record, notify
│   │   │   └── helpdesk/
│   │   │       ├── zendesk.client.ts
│   │   │       ├── freshdesk.client.ts
│   │   │       └── gorgias.client.ts
│   │   │
│   │   ├── analytics/
│   │   │   ├── analytics.service.ts   # Query aggregated metrics
│   │   │   └── rollup.service.ts      # BullMQ job: nightly rollup
│   │   │
│   │   ├── billing/
│   │   │   ├── billing.service.ts     # Plan info, credit balance
│   │   │   ├── credit.service.ts      # Deduct, check, top-up credits
│   │   │   └── stripe.service.ts      # Webhook handler, subscription sync
│   │   │
│   │   ├── storage/
│   │   │   └── storage.service.ts     # S3/R2 presigned upload + download
│   │   │
│   │   └── realtime/
│   │       └── socket.service.ts      # Emit to rooms, manage socket auth
│   │
│   ├── queues/
│   │   ├── queue.ts              # BullMQ queue definitions
│   │   ├── workers/
│   │   │   ├── ingestion.worker.ts    # Process knowledge source → chunk → embed
│   │   │   ├── rollup.worker.ts       # Nightly analytics aggregation
│   │   │   └── webhook.worker.ts      # Retry failed outbound webhooks
│   │   └── scheduler.ts          # Cron job definitions (BullMQ repeat)
│   │
│   ├── lib/
│   │   ├── errors.ts             # AppError class + typed error codes
│   │   ├── crypto.ts             # AES-256-GCM encrypt/decrypt (channel creds)
│   │   ├── pagination.ts         # Cursor-based pagination helpers
│   │   ├── logger.ts             # Pino logger instance
│   │   └── sentry.ts             # Sentry init + captureException wrapper
│   │
│   ├── socket/
│   │   ├── socket.ts             # Socket.io server setup + auth middleware
│   │   └── handlers/
│   │       ├── chat.handler.ts   # join_conversation, send_message events
│   │       └── agent.handler.ts  # agent_status_change events
│   │
│   └── types/
│       ├── express.d.ts          # Augment req.user, req.workspace
│       └── index.ts              # Shared TS types (re-exported)
│
├── prisma/
│   ├── schema.prisma             # Single source of truth for DB schema
│   └── migrations/               # Auto-generated migration files
│
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   └── lib/
│   ├── integration/
│   │   └── routes/
│   └── helpers/
│       ├── db.ts                 # Test DB setup/teardown
│       └── fixtures.ts           # Factory functions for test data
│
├── scripts/
│   ├── seed.ts                   # Development seed data
│   └── migrate-prod.ts           # Safe production migration runner
│
├── docs/                         # ← You are here
├── .env.example
├── .eslintrc.json
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

## Key Architectural Rules

### 1. Routes are thin

Route handlers do nothing except:
- Parse + validate the request body (via `validate()` middleware)
- Call one service function
- Return the result

```ts
// GOOD
router.post('/', validate(createAgentSchema), async (req, res) => {
  const agent = await AgentService.create(req.workspace.id, req.body);
  res.status(201).json(agent);
});

// BAD — business logic in route handler
router.post('/', async (req, res) => {
  const exists = await prisma.agent.findFirst({ where: { name: req.body.name } });
  if (exists) return res.status(409).json({ error: 'exists' });
  // ... 40 more lines
});
```

### 2. Services are pure functions (no Express types)

Services import only `prisma`, `redis`, `openai`, and other services. They never touch `req` or `res`.

### 3. One Prisma client, never instantiate in services

Import from `src/config/prisma.ts`. The singleton handles connection pooling.

### 4. All errors go through `AppError`

```ts
throw new AppError('AGENT_NOT_FOUND', 404, 'Agent not found');
```

The catch-all error handler in `middleware/errorHandler.ts` converts this to:

```json
{ "error": "AGENT_NOT_FOUND", "message": "Agent not found", "statusCode": 404 }
```

### 5. Workspace isolation is enforced at the service layer

Every DB query that touches tenant data includes `workspaceId` in the `where` clause. Never trust the client to pass their own workspace ID in the URL.

```ts
// GOOD
const agent = await prisma.agent.findFirst({
  where: { id: agentId, workspaceId: workspace.id }
});

// BAD — another tenant could access this agent
const agent = await prisma.agent.findFirst({
  where: { id: agentId }
});
```
