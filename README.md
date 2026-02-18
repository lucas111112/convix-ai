# Convix AI

> **"Sell smarter. Support faster. On every channel, for every business."**

Convix AI is an omnichannel AI sales and support agent for any commerce business. It handles the full customer lifecycle — from first question to post-purchase support — and knows exactly when to hand off to a human.

## What's Inside

```
convix-ai/
├── frontend/        # Next.js 14 + TypeScript + Tailwind + shadcn/ui
├── backend/         # Node.js + Express + PostgreSQL + Prisma
├── shared/          # Shared TypeScript types
├── ARCHITECTURE.md  # Full system design document
└── TASKS.md         # Master task list (306 tasks)
```

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16+ (with pgvector extension)
- Redis 7+

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
# → http://localhost:3000
```

### Backend
```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
# → http://localhost:3001
```

### With Docker (recommended for backend services)
```bash
docker-compose up -d   # Starts PostgreSQL + Redis
cd backend && npm run dev
cd frontend && npm run dev
```

## Development Status

See [TASKS.md](./TASKS.md) for the full breakdown of 306 tasks across 5 phases.

Current phase: **Phase 0 — Setup** (not started)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui |
| State | Zustand, TanStack Query |
| Backend | Node.js, Express 5, TypeScript |
| Database | PostgreSQL 16 + pgvector |
| ORM | Prisma |
| AI | OpenAI GPT-4o + RAG |
| Cache | Redis (Upstash) |
| Queue | BullMQ |
| Real-time | Socket.io |
| Auth | JWT + httpOnly refresh cookie |
| Deployment | Vercel (FE) + Railway (BE) + Supabase (DB) |

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full system design including:
- Database schema
- API endpoints
- AI/confidence scoring pipeline
- Channel integration details
- Human handoff flow
- Deployment architecture
