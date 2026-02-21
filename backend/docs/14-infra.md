# Infrastructure & Deployment

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet                              │
└────────────────────────┬────────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │   Vercel (CDN)      │   Next.js 14 frontend
              │   frontend.app      │   Edge runtime, ISR
              └──────────┬──────────┘
                         │ API calls
              ┌──────────▼──────────┐
              │  Railway / Render   │   Express API server
              │  api.app (3001)     │   Node 20, 2 instances
              └──────┬──────────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
  ┌───────▼──────┐    ┌────────▼────────┐
  │  PostgreSQL  │    │     Redis        │
  │  (Railway)   │    │  (Railway)       │
  │  + pgvector  │    │  cache + queues  │
  └──────────────┘    └─────────────────┘

  ┌─────────────────────────────┐
  │  Railway Worker service     │   BullMQ workers
  │  (separate process)         │   ingestion, rollup,
  └─────────────────────────────┘   billing, email, retry
```

---

## Services Summary

| Service | Platform | Runtime | Instances |
|---|---|---|---|
| Frontend | Vercel | Next.js Edge + Node | Auto-scaled |
| API Server | Railway | Node 20 | 2 (prod) |
| Worker Process | Railway | Node 20 | 1 |
| PostgreSQL | Railway | Postgres 16 + pgvector | 1 (managed) |
| Redis | Railway | Redis 7 | 1 (managed) |

---

## Docker

Both the API and worker use the same image, distinguished by the startup command.

### `Dockerfile`

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm

# Deps layer (cached unless package.json changes)
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build layer
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Runtime layer (lean)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 express

COPY --from=builder --chown=express:nodejs /app/dist ./dist
COPY --from=builder --chown=express:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=express:nodejs /app/package.json ./

USER express
EXPOSE 3001

# CMD is overridden per service in Railway
CMD ["node", "dist/index.js"]
```

### `.dockerignore`

```
node_modules
dist
.env*
*.log
coverage
docs
```

---

## Railway Configuration

### API Service (`railway.toml` — api)

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "backend/Dockerfile"

[deploy]
startCommand = "node dist/index.js"
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

[[services]]
name = "api"
```

### Worker Service (`railway.toml` — worker)

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "backend/Dockerfile"

[deploy]
startCommand = "node dist/queues/workers/index.js"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 5

[[services]]
name = "worker"
```

---

## Environment Variables

### Required in Production

```bash
# Server
NODE_ENV=production
PORT=3001
API_BASE_URL=https://api.yourapp.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/axon?schema=public&connection_limit=10&pool_timeout=10

# Redis
REDIS_URL=redis://default:pass@host:6379

# Auth
JWT_SECRET=<256-bit random hex>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=30d

# Frontend
FRONTEND_URL=https://yourapp.com

# OpenAI
OPENAI_API_KEY=sk-...

# Channels
CHANNEL_ENCRYPTION_KEY=<32-byte hex>

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend (email)
RESEND_API_KEY=re_...
RESEND_FROM=noreply@yourapp.com

# Sentry
SENTRY_DSN=https://...@sentry.io/...

# Storage (for file uploads)
S3_BUCKET=axon-uploads
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

### Per-Environment Matrix

| Variable | Development | Staging | Production |
|---|---|---|---|
| `NODE_ENV` | `development` | `staging` | `production` |
| `DATABASE_URL` | local postgres | Railway staging | Railway prod |
| `REDIS_URL` | localhost:6379 | Railway staging | Railway prod |
| `OPENAI_API_KEY` | dev key | shared key | prod key |
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_test_...` | `sk_live_...` |
| `SENTRY_DSN` | omit | staging DSN | prod DSN |

---

## CI/CD Pipeline (GitHub Actions)

### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  lint-and-type:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
        working-directory: backend
      - run: npm run lint
        working-directory: backend
      - run: npx tsc --noEmit
        working-directory: backend

  test:
    runs-on: ubuntu-latest
    needs: lint-and-type
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: axon_test
        ports: ['5432:5432']
        options: --health-cmd pg_isready --health-interval 10s --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    env:
      DATABASE_URL: postgresql://postgres:test@localhost:5432/axon_test
      REDIS_URL: redis://localhost:6379
      JWT_SECRET: test-secret-do-not-use-in-prod
      NODE_ENV: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
        working-directory: backend
      - run: npx prisma migrate deploy
        working-directory: backend
      - run: npm test
        working-directory: backend

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
        working-directory: backend
      - run: npm run build
        working-directory: backend
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: backend/dist

  deploy-staging:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/staging'
    steps:
      - uses: actions/checkout@v4
      - uses: railway-cli@v1
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN_STAGING }}
        with:
          command: up --service api --environment staging
      - uses: railway-cli@v1
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN_STAGING }}
        with:
          command: up --service worker --environment staging

  deploy-production:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production    # requires manual approval in GitHub
    steps:
      - uses: actions/checkout@v4
      - uses: railway-cli@v1
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN_PROD }}
        with:
          command: up --service api --environment production
      - uses: railway-cli@v1
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN_PROD }}
        with:
          command: up --service worker --environment production
```

---

## Database Migrations

### Strategy

Migrations run automatically at deploy time via a pre-start script. This is safe because:
- Prisma migrations are additive by default
- Destructive changes require manual `--accept-data-loss` flag
- Railway health check won't pass (and traffic won't shift) until the process is healthy

### `package.json` scripts

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "prestart": "npx prisma migrate deploy",
    "start:workers": "node dist/queues/workers/index.js",
    "migrate:create": "npx prisma migrate dev --name",
    "migrate:reset": "npx prisma migrate reset",
    "db:seed": "npx ts-node prisma/seed.ts"
  }
}
```

### Migration Safety Rules

1. **Never drop columns or tables in the same migration that removes code referencing them.** Deploy code first (make column optional/unused), then drop in a follow-up migration.
2. **Large table backfills** run as separate one-off jobs, not migrations.
3. **pgvector index creation** uses `CREATE INDEX CONCURRENTLY` to avoid table locks.

---

## Health Check

```ts
// src/routes/health.ts
import { Router } from 'express';
import { prisma } from '../config/db';
import { redis } from '../config/redis';

const router = Router();

router.get('/health', async (req, res) => {
  const checks: Record<string, 'ok' | 'error'> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = 'ok';
  } catch {
    checks.db = 'error';
  }

  try {
    await redis.ping();
    checks.redis = 'ok';
  } catch {
    checks.redis = 'error';
  }

  const healthy = Object.values(checks).every(v => v === 'ok');

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    checks,
    version: process.env.npm_package_version,
    uptime: process.uptime(),
  });
});

export { router as healthRouter };
```

Mount before auth middleware so Railway can reach it unauthenticated:

```ts
app.use('/', healthRouter);   // GET /health — no auth required
app.use('/v1', routes);
```

---

## Monitoring & Observability

### Sentry

```ts
// src/index.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: env.SENTRY_DSN,
  environment: env.NODE_ENV,
  tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
  integrations: [
    Sentry.prismaIntegration(),
  ],
});
```

Sentry captures:
- Unhandled exceptions via `errorHandler` middleware
- Failed BullMQ jobs via `worker.on('failed', ...)`
- Slow DB queries via Prisma integration (>500ms threshold)

### Structured Logging (Pino)

```ts
// src/config/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
  base: {
    service: 'axon-api',
    env: process.env.NODE_ENV,
  },
  redact: ['req.headers.authorization', 'body.password', 'body.token'],
});
```

Log format in production: NDJSON, forwarded to Railway's log drain (or Datadog/Logtail via Railway plugin).

### Request Logging Middleware

```ts
import pinoHttp from 'pino-http';
app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));
```

---

## Horizontal Scaling

### API Layer

Railway supports multiple replicas. With 2+ API instances:
- **Sessions**: Stateless JWT — no sticky sessions needed
- **Socket.io**: Requires Redis adapter (see `11-realtime.md`)
- **Rate limiting**: `RateLimiterRedis` already uses shared Redis — works across instances automatically
- **File uploads**: Use presigned S3 URLs — backend never handles file bytes directly

### Worker Layer

Keep the worker service as a **single instance**. BullMQ supports multiple concurrent workers within one process via `concurrency` option. Running two worker processes would double-process repeatable jobs unless BullMQ's built-in deduplication is relied upon.

If ingestion throughput needs scaling, increase `concurrency` in the ingestion worker (currently 3).

### Database Connection Limits

PostgreSQL has a max connection limit (default 100 for Railway's shared plans). With 2 API instances and 1 worker:

```
DATABASE_URL=...?connection_limit=10&pool_timeout=10
```

Each instance uses Prisma's connection pool of 10, so 3 processes × 10 = 30 connections — well within limits.

Use [PgBouncer](https://www.pgbouncer.org/) (available as a Railway plugin) when scaling beyond 5 instances.

---

## Backup & Disaster Recovery

| Asset | Backup Strategy | RTO | RPO |
|---|---|---|---|
| PostgreSQL | Railway daily snapshots + pg_dump weekly to S3 | 1h | 24h |
| Redis | Redis AOF persistence (Railway managed) | 5m | 1s |
| S3 uploads | S3 Versioning + cross-region replication | 15m | 0 |
| Secrets | Doppler/Railway secrets — document in 1Password | N/A | N/A |

### Manual DB Backup

```bash
# Dump production DB to local file
pg_dump $DATABASE_URL --no-owner --no-acl -Fc -f backup-$(date +%Y%m%d).dump

# Restore to a new DB
pg_restore --no-owner --no-acl -d $TARGET_DATABASE_URL backup-20260101.dump
```

---

## Rollback Procedure

Railway keeps the previous deployment image available.

1. Go to Railway dashboard → Service → Deployments
2. Find the last successful deployment
3. Click "Rollback"
4. If the rollback involves a DB migration: run `npx prisma migrate resolve --rolled-back <migration_name>` manually

For schema rollbacks that require data changes, prepare a reverse migration script before deploying.

---

## Cost Estimates (Monthly)

| Resource | Tier | Estimate |
|---|---|---|
| Railway API (2×) | Hobby Pro | ~$20 |
| Railway Worker (1×) | Hobby Pro | ~$10 |
| Railway PostgreSQL | 8GB | ~$20 |
| Railway Redis | 1GB | ~$5 |
| Vercel Frontend | Hobby | $0 |
| OpenAI | Usage-based | variable |
| Stripe | 2.9% + 30¢ per transaction | variable |
| Resend | 3K emails/mo free | $0–$20 |
| Sentry | 5K errors/mo free | $0–$26 |
| S3 | Usage-based | ~$5 |
| **Total baseline** | | **~$60–80/mo** |
