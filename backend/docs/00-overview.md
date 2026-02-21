# Backend Overview

## What This Is

The Axon AI backend is a multi-tenant REST + WebSocket API that powers every live feature in the dashboard. It sits between the Next.js frontend and the outside world — handling authentication, persisting agent configurations, running the AI pipeline, routing inbound channel messages, and streaming responses back in real time.

## Responsibilities

| Domain | What the backend owns |
|---|---|
| **Auth** | JWT issuance, refresh rotation, session management |
| **Workspaces** | Multi-tenant isolation — every resource belongs to a workspace |
| **Agents** | CRUD, system-prompt storage, per-agent settings |
| **AI Pipeline** | RAG retrieval, GPT-4o completion, confidence scoring |
| **Knowledge** | Ingestion, chunking, embedding, vector search |
| **Channels** | Webhook ingestion from WhatsApp / Telegram / SMS / Voice / etc. |
| **Conversations** | Message persistence, status tracking, history |
| **Handoff** | Confidence-triggered escalation, helpdesk routing |
| **Analytics** | Aggregated metrics, time-series storage, export |
| **Billing** | Credit ledger, plan enforcement, Stripe webhooks |
| **Real-time** | Socket.io rooms per conversation and per workspace |
| **Background Jobs** | Ingestion queue, analytics rollup, credit checks |

## Technology Stack

```
Runtime        Node.js 20 LTS
Language       TypeScript 5
Framework      Express 5
Validation     Zod
ORM            Prisma 5
Database       PostgreSQL 16 + pgvector extension
Cache          Redis (Upstash, TLS)
Queue          BullMQ (backed by Redis)
Real-time      Socket.io 4
AI             OpenAI SDK (GPT-4o + text-embedding-3-small)
Auth           jsonwebtoken + bcrypt
File storage   AWS S3 / Cloudflare R2 (PDFs, audio)
Email          Resend (transactional)
SMS/Voice      Twilio
Logging        Pino (structured JSON)
Errors         Sentry
Testing        Vitest + Supertest
```

## Request Lifecycle (Happy Path)

```
Browser / Channel Webhook
        │
        ▼
   Express Router
        │
   ┌────┴────────────────────────────┐
   │  Middleware stack               │
   │  1. helmet (security headers)   │
   │  2. cors (origin whitelist)     │
   │  3. rate-limiter-flexible       │
   │  4. express.json (body parse)   │
   │  5. authenticate (JWT verify)   │
   │  6. requireWorkspace (tenant)   │
   └────┬────────────────────────────┘
        │
   Route Handler
        │
   Service Layer
   (pure TS functions, no Express refs)
        │
   Prisma / Redis / OpenAI / Twilio
        │
        ▼
   JSON Response  ──  Socket.io event
```

## Port Layout (local dev)

| Service | Port | Notes |
|---|---|---|
| Next.js frontend | 3000 | `npm run dev` |
| Express API | 3001 | `npm run dev` in `/backend` |
| PostgreSQL | 5432 | Docker or managed |
| Redis | 6379 | Docker or Upstash |
| BullMQ dashboard | 3002 | Bull Board (dev only) |

## Environment Variables

See `/.env.example` at repo root. Backend-specific vars:

```bash
# Core
NODE_ENV=development
PORT=3001
API_BASE_URL=http://localhost:3001

# Database
DATABASE_URL=postgresql://axon:password@localhost:5432/axon_dev
DATABASE_POOL_MAX=10

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=<32-byte hex>
JWT_REFRESH_SECRET=<32-byte hex>
JWT_ACCESS_TTL=900          # 15 minutes in seconds
JWT_REFRESH_TTL=2592000     # 30 days in seconds
BCRYPT_ROUNDS=12

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_MAX_TOKENS=1024
OPENAI_TEMPERATURE=0.3

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Storage (R2 / S3)
STORAGE_BUCKET=axon-uploads
STORAGE_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
STORAGE_ACCESS_KEY=...
STORAGE_SECRET_KEY=...

# Resend
RESEND_API_KEY=re_...
RESEND_FROM=noreply@axon.ai

# Sentry
SENTRY_DSN=https://...

# Frontend (CORS allow-list)
FRONTEND_URL=http://localhost:3000
```

## Non-Goals

The backend does **not**:

- Serve static assets (that's Vercel/CDN)
- Render HTML (pure JSON API)
- Store raw audio long-term (streamed through Twilio, only transcripts persisted)
- Handle billing UI (frontend uses Stripe's hosted pages; backend only validates webhooks and manages the credit ledger)
