# Convix AI — System Architecture

> Omnichannel AI Sales & Support Agent for Every Commerce Business
> Stack: Next.js 14 · TypeScript · Tailwind · shadcn/ui | Node.js · Express · PostgreSQL

---

## Table of Contents

1. [System Overview](#system-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Database Schema](#database-schema)
6. [API Design](#api-design)
7. [AI & Intelligence Layer](#ai--intelligence-layer)
8. [Channel Integration Layer](#channel-integration-layer)
9. [Human Handoff System](#human-handoff-system)
10. [Real-time Layer](#real-time-layer)
11. [Folder Structure](#folder-structure)
12. [Environment Variables](#environment-variables)
13. [Deployment Architecture](#deployment-architecture)
14. [Security Model](#security-model)
15. [Data Flow Diagrams](#data-flow-diagrams)

---

## System Overview

Convix AI is a multi-tenant SaaS platform. Each tenant (merchant) connects their store, trains the AI on their product catalog and policies, and deploys an AI agent across multiple channels. The agent handles sales conversations and customer support autonomously, escalating to human agents when confidence drops below configurable thresholds.

### Core Capabilities
- **Proactive Sales**: Detect buying intent, recommend products, close sales
- **Full Support**: Order tracking, returns, refunds, FAQs, account issues
- **Omnichannel**: Web widget, WhatsApp, SMS, Instagram DM, Facebook Messenger, Email, Slack
- **Smart Handoff**: Confidence-based routing to human agents with full context
- **Self-Learning**: Learns from human escalations to reduce future handoffs
- **B2B Support**: Auth-aware, tiered pricing, account rep routing

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          MERCHANT DASHBOARD                              │
│              (Next.js 14 App Router — Vercel)                           │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ HTTPS / REST / WebSocket
┌──────────────────────────────▼──────────────────────────────────────────┐
│                          API GATEWAY                                     │
│                    (Express + Node.js — Railway)                         │
│   Auth · Rate Limiting · Request Validation · Logging                   │
└────┬──────────┬──────────┬──────────┬──────────┬────────────────────────┘
     │          │          │          │          │
     ▼          ▼          ▼          ▼          ▼
  Auth       Core       AI         Channel    Handoff
  Service    API        Service    Gateway    Service
     │          │          │          │          │
     └──────────┴──────────┴──────────┴──────────┘
                               │
                    ┌──────────▼──────────┐
                    │    PostgreSQL DB     │
                    │  (Supabase/Railway)  │
                    └─────────────────────┘

External Channels:
  WhatsApp ──────────┐
  Instagram DM ──────┤
  SMS (Twilio) ──────┼──▶ Channel Gateway ──▶ AI Service ──▶ Response
  Facebook Msg ──────┤
  Email ─────────────┘

AI Stack:
  GPT-4o ──▶ Response Generation
  OpenAI Embeddings ──▶ RAG / Vector Search
  pgvector ──▶ Vector Store (in PostgreSQL)
  Confidence Engine ──▶ Handoff Decisions
```

---

## Frontend Architecture

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui component library
- **State**: Zustand (global), React Query / TanStack Query (server state)
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Real-time**: Socket.io client

### App Router Structure

```
app/
├── (marketing)/              # Public pages — no auth required
│   ├── page.tsx              # Landing page
│   ├── pricing/page.tsx      # Pricing page
│   ├── features/page.tsx     # Features page
│   └── layout.tsx            # Marketing layout (navbar + footer)
│
├── (auth)/                   # Auth pages
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── forgot-password/page.tsx
│   └── layout.tsx
│
├── (onboarding)/             # New user onboarding flow
│   ├── connect-store/page.tsx
│   ├── train-ai/page.tsx
│   ├── customize/page.tsx
│   ├── channels/page.tsx
│   ├── go-live/page.tsx
│   └── layout.tsx
│
├── dashboard/                # Protected merchant dashboard
│   ├── page.tsx              # Overview
│   ├── conversations/
│   │   ├── page.tsx          # Conversation list
│   │   └── [id]/page.tsx     # Single conversation
│   ├── analytics/page.tsx    # Analytics dashboard
│   ├── channels/
│   │   ├── page.tsx          # Channel list
│   │   └── [channel]/page.tsx # Channel setup
│   ├── widget/page.tsx       # Chat widget customizer
│   ├── training/page.tsx     # AI training manager
│   ├── settings/
│   │   ├── page.tsx          # General settings
│   │   ├── escalation/page.tsx
│   │   ├── team/page.tsx
│   │   └── billing/page.tsx
│   └── layout.tsx            # Dashboard layout (sidebar + header)
│
└── layout.tsx                # Root layout
```

### Component Architecture

```
components/
├── ui/                       # shadcn/ui base components (auto-generated)
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── input.tsx
│   ├── table.tsx
│   └── ... (all shadcn primitives)
│
├── layout/                   # Layout components
│   ├── DashboardSidebar.tsx
│   ├── DashboardHeader.tsx
│   ├── MarketingNav.tsx
│   └── Footer.tsx
│
├── dashboard/                # Dashboard-specific components
│   ├── StatsCard.tsx
│   ├── ConversationList.tsx
│   ├── ConversationThread.tsx
│   ├── CustomerSidebar.tsx
│   ├── HandoffPanel.tsx
│   ├── AnalyticsChart.tsx
│   ├── ChannelCard.tsx
│   ├── ChannelSetupWizard.tsx
│   └── RevenueChart.tsx
│
├── widget/                   # Embeddable chat widget
│   ├── ChatWidget.tsx        # Main widget shell
│   ├── ChatBubble.tsx
│   ├── MessageList.tsx
│   ├── MessageInput.tsx
│   ├── TypingIndicator.tsx
│   ├── HandoffTransition.tsx
│   └── WidgetPreview.tsx
│
├── onboarding/               # Onboarding flow steps
│   ├── StoreConnector.tsx
│   ├── PlatformPicker.tsx
│   ├── AITrainer.tsx
│   ├── AppearanceEditor.tsx
│   └── ChannelSelector.tsx
│
├── marketing/                # Landing page sections
│   ├── Hero.tsx
│   ├── Features.tsx
│   ├── Pricing.tsx
│   ├── ComparisonTable.tsx
│   ├── Testimonials.tsx
│   └── CTA.tsx
│
└── shared/                   # Shared across app
    ├── LoadingSpinner.tsx
    ├── EmptyState.tsx
    ├── ErrorState.tsx
    ├── ConfirmDialog.tsx
    ├── DataTable.tsx
    └── PageHeader.tsx
```

### State Management

```
stores/
├── authStore.ts              # User session, JWT token
├── storeStore.ts             # Connected merchant store data
├── conversationStore.ts      # Active conversations, filters
├── widgetStore.ts            # Widget customization settings
└── notificationStore.ts      # Real-time notification queue
```

### Mock Data Layer (Phase 1)

All mock data lives in `/lib/mock/` and is clearly flagged:

```typescript
// lib/mock/conversations.ts
// TODO: REPLACE WITH API — GET /api/conversations
export const mockConversations: Conversation[] = [ ... ]
```

---

## Backend Architecture

### Tech Stack
- **Runtime**: Node.js 20 LTS
- **Framework**: Express 5
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL 16 + pgvector extension
- **Auth**: JWT (access token 15min) + Refresh token (30 days, httpOnly cookie)
- **Caching**: Redis (sessions, rate limiting, AI response cache)
- **Queue**: BullMQ (async jobs: AI processing, webhook handling, email)
- **Real-time**: Socket.io
- **Validation**: Zod
- **Logging**: Winston + Pino

### Service Structure

```
backend/
├── src/
│   ├── server.ts             # Express app bootstrap
│   ├── app.ts                # Middleware registration
│   │
│   ├── routes/               # Route definitions
│   │   ├── auth.routes.ts
│   │   ├── stores.routes.ts
│   │   ├── conversations.routes.ts
│   │   ├── messages.routes.ts
│   │   ├── analytics.routes.ts
│   │   ├── channels.routes.ts
│   │   ├── training.routes.ts
│   │   ├── handoff.routes.ts
│   │   ├── webhooks.routes.ts
│   │   └── widget.routes.ts
│   │
│   ├── controllers/          # Request handlers
│   ├── services/             # Business logic
│   │   ├── ai.service.ts     # GPT-4o + RAG
│   │   ├── confidence.service.ts
│   │   ├── handoff.service.ts
│   │   ├── channel.service.ts
│   │   └── analytics.service.ts
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── rateLimit.middleware.ts
│   │   ├── validate.middleware.ts
│   │   └── error.middleware.ts
│   │
│   ├── lib/
│   │   ├── prisma.ts         # Prisma client singleton
│   │   ├── redis.ts          # Redis client
│   │   ├── openai.ts         # OpenAI client
│   │   ├── socket.ts         # Socket.io setup
│   │   └── queue.ts          # BullMQ setup
│   │
│   └── types/                # Shared TypeScript types
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
└── package.json
```

---

## Database Schema

```prisma
// prisma/schema.prisma

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String
  role          UserRole  @default(OWNER)
  stores        Store[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Store {
  id              String        @id @default(cuid())
  userId          String
  user            User          @relation(fields: [userId], references: [id])
  name            String
  platform        Platform      // SHOPIFY | WOOCOMMERCE | BIGCOMMERCE | CUSTOM | SAAS
  domain          String
  apiKey          String?       // Encrypted
  isB2B           Boolean       @default(false)
  plan            PlanTier      @default(STARTER)
  conversations   Conversation[]
  channels        Channel[]
  trainingDocs    TrainingDoc[]
  settings        StoreSettings?
  createdAt       DateTime      @default(now())
}

model Conversation {
  id              String        @id @default(cuid())
  storeId         String
  store           Store         @relation(fields: [storeId], references: [id])
  channel         ChannelType   // WEB | WHATSAPP | SMS | INSTAGRAM | MESSENGER | EMAIL
  customerEmail   String?
  customerName    String?
  customerPhone   String?
  status          ConvStatus    @default(ACTIVE)  // ACTIVE | HANDED_OFF | RESOLVED | ABANDONED
  messages        Message[]
  handoff         Handoff?
  sentiment       Float?        // -1.0 to 1.0
  intentScore     Float?        // 0.0 to 1.0 (purchase intent)
  revenueAttributed Float?      // USD
  resolvedAt      DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

model Message {
  id              String        @id @default(cuid())
  conversationId  String
  conversation    Conversation  @relation(fields: [conversationId], references: [id])
  role            MessageRole   // USER | AI | HUMAN_AGENT | SYSTEM
  content         String
  confidenceScore Float?        // AI confidence on this response (0.0-1.0)
  metadata        Json?         // product recommendations, order data refs, etc.
  createdAt       DateTime      @default(now())
}

model Handoff {
  id              String        @id @default(cuid())
  conversationId  String        @unique
  conversation    Conversation  @relation(fields: [conversationId], references: [id])
  trigger         HandoffTrigger // LOW_CONFIDENCE | ANGER | EXPLICIT_REQUEST | UNRESOLVED | HIGH_VALUE
  summary         String        // AI-generated summary for human agent
  agentId         String?       // Human agent who took over
  resolvedAt      DateTime?
  learningNote    String?       // What the AI should learn from this
  createdAt       DateTime      @default(now())
}

model Channel {
  id              String        @id @default(cuid())
  storeId         String
  store           Store         @relation(fields: [storeId], references: [id])
  type            ChannelType
  isActive        Boolean       @default(false)
  config          Json          // Channel-specific config (tokens, phone numbers, etc — encrypted)
  createdAt       DateTime      @default(now())
}

model TrainingDoc {
  id              String        @id @default(cuid())
  storeId         String
  store           Store         @relation(fields: [storeId], references: [id])
  type            DocType       // FAQ | POLICY | PRODUCT_CATALOG | URL | MANUAL
  title           String
  content         String
  embedding       Unsupported("vector(1536)")?  // pgvector
  isActive        Boolean       @default(true)
  createdAt       DateTime      @default(now())
}

model StoreSettings {
  id                    String    @id @default(cuid())
  storeId               String    @unique
  store                 Store     @relation(fields: [storeId], references: [id])
  brandVoice            String?   // e.g. "Friendly and professional"
  forbiddenTopics       String[]
  confidenceThreshold   Float     @default(0.65)
  handoffDestination    String    @default("TICKET")  // TICKET | LIVE_AGENT | EMAIL
  businessHoursStart    String?   // "09:00"
  businessHoursEnd      String?   // "18:00"
  businessHoursTimezone String?
  highValueCartThreshold Float?   // USD — triggers extra care
  zendeskApiKey         String?
  gorgiasApiKey         String?
  freshdeskApiKey       String?
  widgetConfig          Json?     // colors, position, avatar, greeting
}

enum UserRole    { OWNER ADMIN AGENT }
enum Platform    { SHOPIFY WOOCOMMERCE BIGCOMMERCE SQUARESPACE WIX CUSTOM SAAS }
enum PlanTier    { STARTER GROWTH SCALE ENTERPRISE }
enum ChannelType { WEB WHATSAPP SMS INSTAGRAM MESSENGER EMAIL SLACK }
enum ConvStatus  { ACTIVE HANDED_OFF RESOLVED ABANDONED }
enum MessageRole { USER AI HUMAN_AGENT SYSTEM }
enum DocType     { FAQ POLICY PRODUCT_CATALOG URL MANUAL }
enum HandoffTrigger {
  LOW_CONFIDENCE AMBIGUOUS_INTENT ANGER_DETECTED
  EXPLICIT_REQUEST HIGH_VALUE_AT_RISK UNRESOLVED_AFTER_3
}
```

---

## API Design

### Base URL
```
Production:  https://api.convix.ai/v1
Development: http://localhost:3001/v1
```

### Auth Endpoints
```
POST   /auth/register          Create account
POST   /auth/login             Login, returns access + refresh tokens
POST   /auth/refresh           Refresh access token
POST   /auth/logout            Invalidate refresh token
POST   /auth/forgot-password   Send reset email
POST   /auth/reset-password    Reset with token
GET    /auth/me                Current user info
```

### Store Endpoints
```
GET    /stores                 List user's stores
POST   /stores                 Create store
GET    /stores/:id             Get store details
PATCH  /stores/:id             Update store
DELETE /stores/:id             Delete store
GET    /stores/:id/settings    Get settings
PATCH  /stores/:id/settings    Update settings
```

### Conversation Endpoints
```
GET    /stores/:id/conversations         List conversations (paginated, filterable)
GET    /stores/:id/conversations/:convId Get conversation + messages
PATCH  /stores/:id/conversations/:convId Update status
POST   /stores/:id/conversations/:convId/handoff  Trigger manual handoff
```

### Analytics Endpoints
```
GET    /stores/:id/analytics/overview    Totals: conversations, revenue, handoff rate
GET    /stores/:id/analytics/volume      Conversation volume over time
GET    /stores/:id/analytics/channels    Per-channel breakdown
GET    /stores/:id/analytics/questions   Top questions clustered by topic
GET    /stores/:id/analytics/handoffs    Handoff rate trend + trigger breakdown
```

### Channel Endpoints
```
GET    /stores/:id/channels              List channels + status
POST   /stores/:id/channels             Add channel
PATCH  /stores/:id/channels/:channelId  Update channel config
DELETE /stores/:id/channels/:channelId  Remove channel
POST   /stores/:id/channels/:channelId/test  Test channel connection
```

### Training Endpoints
```
GET    /stores/:id/training              List training docs
POST   /stores/:id/training             Upload doc / URL / FAQ
PATCH  /stores/:id/training/:docId      Update doc
DELETE /stores/:id/training/:docId      Delete doc
POST   /stores/:id/training/retrain     Trigger full reindex
```

### Widget Endpoints
```
GET    /widget/:storeId/config          Public — get widget config for embed
POST   /widget/:storeId/conversation    Start new conversation (public)
POST   /widget/:storeId/message         Send message (public)
```

### Webhook Endpoints (incoming from channels)
```
POST   /webhooks/whatsapp               WhatsApp Cloud API webhook
POST   /webhooks/instagram              Instagram webhook
POST   /webhooks/messenger              Facebook Messenger webhook
POST   /webhooks/sms                    Twilio SMS webhook
POST   /webhooks/email                  Inbound email webhook
```

---

## AI & Intelligence Layer

### Confidence Score Engine

Every AI response is scored before sending:

```typescript
interface ConfidenceScore {
  factual: number;    // 0-1: Does AI have verified data to answer?
  intent: number;     // 0-1: Does AI understand what customer wants?
  emotional: number;  // 0-1: Is customer calm? (1=calm, 0=very distressed)
  composite: number;  // Weighted average
}

// Weights
const WEIGHTS = { factual: 0.45, intent: 0.35, emotional: 0.20 }

// Handoff triggered when composite < store.settings.confidenceThreshold (default 0.65)
```

### RAG Pipeline

```
1. Customer message arrives
2. Embed message → 1536-dim vector (OpenAI text-embedding-3-small)
3. pgvector similarity search across store's TrainingDocs
4. Top-K relevant docs retrieved (k=5, threshold=0.78)
5. Inject retrieved context + conversation history → GPT-4o prompt
6. Parse response → extract intent, score confidence, check for product refs
7. Score confidence → decide: send response OR trigger handoff
8. Log message + metadata to DB
9. Update conversation sentiment + intent score
```

### Prompt Architecture

```typescript
const SYSTEM_PROMPT = `
You are a helpful AI assistant for {storeName}.
Brand voice: {brandVoice}
Current date: {date}

CONTEXT FROM KNOWLEDGE BASE:
{retrievedDocs}

CONVERSATION HISTORY:
{conversationHistory}

RULES:
- Never discuss: {forbiddenTopics}
- If you're unsure about order details, say so and offer to connect to support
- Always be honest about being an AI if asked directly
- If sentiment is negative or request is complex, recommend human assistance
`
```

---

## Channel Integration Layer

### WhatsApp (Meta Cloud API)
- Receive messages via webhook → verify signature → route to AI service
- Send responses via `POST https://graph.facebook.com/v18.0/{phone-id}/messages`
- Template messages for cart recovery campaigns
- Session management: 24-hour customer-initiated window

### Instagram DMs (Meta Graph API)
- Webhook subscription to `messages` field on Instagram account
- Send via `POST /me/messages` with Instagram PSID
- Handle story replies and direct messages

### SMS (Twilio)
- Receive inbound SMS via Twilio webhook
- Reply via Twilio REST API `messages.create()`
- Phone number management per store
- Opt-out handling (STOP keyword → flag customer)

### Facebook Messenger
- Page webhook subscription
- Send/receive via Messenger Platform API
- Persistent menu, quick replies support

### Email (Postmark / SendGrid inbound)
- Inbound email webhook → parse sender, subject, body
- Reply-to threading for conversation continuity
- HTML/plain text response formatting

---

## Human Handoff System

### Handoff Decision Flow

```
Message received
      │
      ▼
AI generates response
      │
      ▼
Confidence scored (factual × intent × emotional)
      │
      ├─ composite ≥ threshold ──▶ Send AI response
      │
      └─ composite < threshold ──▶ HANDOFF TRIGGERED
                                         │
                                         ▼
                               Generate conversation summary
                               (AI summarizes the issue, what was tried)
                                         │
                                         ▼
                               Notify customer honestly
                               "Let me connect you with our team"
                                         │
                               ┌─────────┴─────────┐
                               ▼                   ▼
                          Business hours?      After hours?
                               │                   │
                               ▼                   ▼
                        Route to:          Create ticket +
                        Live agent /       Send ETA to customer
                        Zendesk /
                        Gorgias /
                        Freshdesk
```

### Learning Loop

After human resolves handoff:
1. Human agent optionally adds `learningNote` to handoff record
2. Nightly job processes unlearned handoffs
3. Extracts Q&A patterns → generates new TrainingDoc entry
4. Triggers reindex of store's vector store
5. Next similar question → AI handles autonomously

---

## Real-time Layer

### Socket.io Events

```typescript
// Server → Client (Dashboard)
'conversation:new'          // New conversation started
'conversation:updated'      // Status change
'message:new'               // New message in conversation
'handoff:triggered'         // Handoff needs agent attention
'analytics:update'          // Live stats refresh

// Client → Server (Dashboard)
'agent:join-conversation'   // Agent taking over handoff
'agent:message'             // Human agent sending message
'agent:resolve'             // Agent marking as resolved
```

---

## Folder Structure (Full Project)

```
convix-ai/
├── ARCHITECTURE.md           ← This file
├── TASKS.md                  ← Master task list
├── README.md
├── .env.example
├── .gitignore
│
├── frontend/                 # Next.js 14 app
│   ├── app/
│   ├── components/
│   ├── lib/
│   │   ├── mock/             # All mock data (Phase 1)
│   │   ├── api/              # API client functions (Phase 3)
│   │   └── utils/
│   ├── stores/               # Zustand stores
│   ├── hooks/                # Custom React hooks
│   ├── types/                # TypeScript types
│   ├── public/
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   └── package.json
│
├── backend/                  # Express API
│   ├── src/
│   ├── prisma/
│   └── package.json
│
└── shared/                   # Shared types between frontend + backend
    └── types/
```

---

## Environment Variables

### Frontend (`frontend/.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Phase 1: These are unused (mock data), add in Phase 3
```

### Backend (`backend/.env`)
```bash
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/convix

# Auth
JWT_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
JWT_EXPIRES_IN=15m
REFRESH_EXPIRES_IN=30d

# AI
OPENAI_API_KEY=sk-...

# Redis
REDIS_URL=redis://localhost:6379

# Channels (add as you integrate)
WHATSAPP_TOKEN=
WHATSAPP_PHONE_ID=
WHATSAPP_VERIFY_TOKEN=
INSTAGRAM_APP_SECRET=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Helpdesks
ZENDESK_SUBDOMAIN=
ZENDESK_API_TOKEN=
GORGIAS_DOMAIN=
GORGIAS_API_KEY=
FRESHDESK_DOMAIN=
FRESHDESK_API_KEY=

# Email
POSTMARK_API_KEY=

# Encryption (for storing channel tokens)
ENCRYPTION_KEY=32-char-key-here
```

---

## Deployment Architecture

```
Production:
  Frontend   → Vercel (auto-deploy from main branch)
  Backend    → Railway (Docker container)
  Database   → Supabase (PostgreSQL + pgvector)
  Redis      → Upstash (serverless Redis)
  Files      → Cloudflare R2 (training doc uploads)
  CDN        → Cloudflare

CI/CD:
  GitHub Actions → lint + typecheck + test → deploy

Environments:
  development  → local Docker Compose
  staging      → Vercel preview + Railway staging service
  production   → Vercel production + Railway production
```

---

## Security Model

- **Auth**: JWT access tokens (15min) + httpOnly refresh token cookies (30 days)
- **Multi-tenancy**: Every DB query scoped to `storeId` — middleware enforces ownership
- **Secrets**: Channel API tokens encrypted at rest (AES-256) in DB
- **Rate Limiting**: Per-IP on public endpoints, per-store on API endpoints
- **CORS**: Whitelist only known origins (dashboard + widget embed domains)
- **Webhooks**: Verify HMAC signatures on all incoming channel webhooks
- **Input Validation**: Zod schemas on all endpoints, never trust client data
- **SQL Injection**: Prevented by Prisma ORM (parameterized queries)
- **XSS**: React escapes by default, CSP headers on all responses
- **Secrets in Logs**: Winston configured to scrub sensitive fields

---

## Data Flow Diagrams

### Customer Sends Message (Web Widget)

```
Customer types message
        │
        ▼
Widget POSTs to /widget/:storeId/message
        │
        ▼
API validates (store active? channel active? within plan limits?)
        │
        ▼
Message saved to DB (role: USER)
        │
        ▼
AI Service invoked async
  ├── Embed message (OpenAI)
  ├── pgvector similarity search → retrieve top-5 training docs
  ├── Build prompt (system + history + context + message)
  ├── GPT-4o completion
  ├── Score confidence (factual + intent + emotional)
  └── Decision:
       ├── confidence ≥ 0.65 → save AI message → return response
       └── confidence < 0.65 → trigger handoff flow
        │
        ▼
Response returned to widget via HTTP (or WebSocket push)
```

### Merchant Views Dashboard

```
Merchant opens dashboard
        │
        ▼
Auth middleware validates JWT
        │
        ▼
GET /stores/:id/conversations
  └── Returns paginated list
      (Phase 1: mock data from /lib/mock/conversations.ts)
      (Phase 3: real DB query with filters)
        │
        ▼
React Query caches + renders conversation list
        │
        ▼
Socket.io connects → subscribes to store's real-time events
        │
        ▼
New conversation arrives → 'conversation:new' event → UI updates instantly
```
