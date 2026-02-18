# Convix AI — Master Task List

> **Legend**: `[ ]` pending · `[x]` complete · `[-]` in progress · `[!]` blocked
> **Priority**: `P0` = ship blocker · `P1` = core feature · `P2` = nice to have
> **Phase**: 0=Setup · 1=Frontend · 2=Backend · 3=Integration · 4=Polish · 5=Launch

---

## PHASE 0 — Project Setup & Infrastructure

### 0.1 Repository & Tooling
- [ ] P0 · Create GitHub repository `convix-ai`
- [ ] P0 · Initialize monorepo root with `package.json` and workspaces
- [ ] P0 · Add `.gitignore` (node_modules, .env, .next, dist, *.key)
- [ ] P0 · Add root `README.md` with project overview and setup instructions
- [ ] P0 · Set up Git branch strategy: `main` (prod), `dev` (staging), `feat/*` (features)
- [ ] P0 · Configure GitHub branch protection on `main` (require PR + review)
- [ ] P0 · Add `.env.example` files for frontend and backend
- [ ] P1 · Set up GitHub Actions CI workflow (lint + typecheck on PR)
- [ ] P1 · Configure Husky pre-commit hooks (lint-staged)
- [ ] P1 · Add Commitlint for conventional commit messages
- [ ] P2 · Set up GitHub Actions CD workflow (auto-deploy on merge to main)
- [ ] P2 · Create issue and PR templates in `.github/`

### 0.2 Frontend Bootstrap
- [ ] P0 · Scaffold Next.js 14 app in `frontend/` with App Router + TypeScript
- [ ] P0 · Configure `tsconfig.json` with strict mode + path aliases (`@/`)
- [ ] P0 · Install and configure Tailwind CSS
- [ ] P0 · Install and initialize shadcn/ui (`npx shadcn-ui@latest init`)
- [ ] P0 · Install core shadcn/ui components: Button, Card, Input, Label, Dialog, Sheet, Dropdown, Badge, Avatar, Skeleton, Table, Tabs, Toast, Select, Switch, Textarea, Separator
- [ ] P0 · Install Zustand, TanStack Query, React Hook Form, Zod
- [ ] P0 · Install Recharts, Lucide React, Framer Motion, clsx, tailwind-merge
- [ ] P0 · Configure TanStack Query provider in root layout
- [ ] P0 · Configure Toaster (shadcn/ui Sonner) in root layout
- [ ] P1 · Set up ESLint with Next.js + TypeScript rules
- [ ] P1 · Set up Prettier with Tailwind class sorting plugin
- [ ] P1 · Create `lib/utils.ts` with `cn()` helper (clsx + tailwind-merge)
- [ ] P1 · Create base TypeScript types in `types/` (Conversation, Message, Store, User, Channel, Analytics)
- [ ] P1 · Create `lib/mock/index.ts` — centralized mock data exports
- [ ] P1 · Create `lib/constants.ts` — app-wide constants (channel types, plan tiers, etc.)

### 0.3 Backend Bootstrap
- [ ] P0 · Scaffold Express + TypeScript app in `backend/`
- [ ] P0 · Configure `tsconfig.json` for backend
- [ ] P0 · Install Express, Prisma, Zod, Winston, cors, helmet, dotenv
- [ ] P0 · Install JWT, bcrypt, cookie-parser
- [ ] P0 · Set up Prisma with initial schema
- [ ] P0 · Create `src/server.ts` entry point
- [ ] P0 · Create `src/app.ts` with middleware pipeline
- [ ] P1 · Configure Winston logger (console dev, file prod)
- [ ] P1 · Set up `nodemon` + `ts-node` for development hot reload
- [ ] P1 · Create global error handling middleware
- [ ] P1 · Create `src/lib/prisma.ts` singleton client
- [ ] P2 · Set up Docker Compose for local PostgreSQL + Redis

---

## PHASE 1 — Frontend (Mock Data, No Real Backend)

> All data comes from `lib/mock/`. Every mock usage marked `// TODO: REPLACE WITH API`

### 1.1 Design System & Theme
- [ ] P0 · Define brand color palette in `tailwind.config.ts` (primary, accent, neutral, danger, success)
- [ ] P0 · Configure CSS variables for light/dark mode in `globals.css`
- [ ] P0 · Create typography scale (headings, body, captions, code)
- [ ] P0 · Design and implement logo / wordmark (SVG)
- [ ] P0 · Create `components/ui/` custom overrides for shadcn defaults (brand colors)
- [ ] P1 · Create skeleton loading variants for all major data displays
- [ ] P1 · Create `EmptyState` component (icon + title + description + optional CTA)
- [ ] P1 · Create `ErrorState` component with retry action
- [ ] P1 · Create `PageHeader` component (title + breadcrumb + actions slot)
- [ ] P1 · Create `DataTable` component with sorting, filtering, pagination
- [ ] P1 · Create `ConfirmDialog` component (generic destructive action confirmation)
- [ ] P1 · Create `StatusBadge` component (maps conversation status to color)
- [ ] P2 · Implement dark mode toggle with `next-themes`
- [ ] P2 · Add keyboard shortcut system (⌘K command palette stub)

### 1.2 Marketing / Landing Page
- [ ] P0 · Create `(marketing)/layout.tsx` with `MarketingNav` + `Footer`
- [ ] P0 · Build `MarketingNav` — logo, links (Features, Pricing), CTA buttons (Login, Start Free)
- [ ] P0 · Build `Hero` section — headline, sub-copy, CTA buttons, widget screenshot/mockup
- [ ] P0 · Build `Features` section — 6 feature cards with icons (platform agnostic, omnichannel, B2B, analytics, handoff, support)
- [ ] P0 · Build `Pricing` section — 4 tier cards with feature lists and CTA
- [ ] P1 · Build `ComparisonTable` section (Convix vs Zipchat vs Tidio vs Intercom)
- [ ] P1 · Build `Testimonials` section — 3 placeholder testimonial cards
- [ ] P1 · Build `HowItWorks` section — 3-step visual (Connect → Train → Deploy)
- [ ] P1 · Build `ChannelLogos` strip — logos of all 7 supported channels
- [ ] P1 · Build `CTA` banner section — "Start free in 2 minutes" + email capture
- [ ] P1 · Build `Footer` — links, social, legal, copyright
- [ ] P1 · Add scroll animations with Framer Motion
- [ ] P2 · Add SEO metadata (`generateMetadata`) for landing page
- [ ] P2 · Add Open Graph image
- [ ] P2 · Add structured data (JSON-LD) for SaaS product

### 1.3 Auth Pages
- [ ] P0 · Create `(auth)/layout.tsx` — centered card layout with logo
- [ ] P0 · Build `login/page.tsx` — email + password form, "Remember me", forgot password link
- [ ] P0 · Build `signup/page.tsx` — name + email + password + confirm, terms checkbox
- [ ] P0 · Build `forgot-password/page.tsx` — email input, "check your inbox" state
- [ ] P1 · Build `reset-password/page.tsx` — new password + confirm form (token from URL)
- [ ] P1 · Add form validation (React Hook Form + Zod schemas)
- [ ] P1 · Add loading states to all auth form submit buttons
- [ ] P1 · Create `lib/mock/auth.ts` with mock user session
  - [ ] `// TODO: REPLACE WITH API — POST /auth/login`
  - [ ] `// TODO: REPLACE WITH API — POST /auth/register`
- [ ] P2 · Add "Continue with Google" button (placeholder, non-functional in Phase 1)

### 1.4 Onboarding Flow
- [ ] P0 · Create `(onboarding)/layout.tsx` — progress stepper + step counter
- [ ] P0 · Build `ProgressStepper` component (5 steps: Connect → Train → Customize → Channels → Go Live)
- [ ] P0 · Build Step 1 — `connect-store/page.tsx`:
  - [ ] Platform grid (Shopify, WooCommerce, BigCommerce, Squarespace, Wix, Custom, SaaS)
  - [ ] Store name + URL input fields
  - [ ] B2B toggle with explainer
  - [ ] Mock "Connect" action with loading + success state
- [ ] P0 · Build Step 2 — `train-ai/page.tsx`:
  - [ ] Upload area (drag-and-drop) for PDFs, DOCX, TXT
  - [ ] URL scraper input (paste website URL)
  - [ ] Manual FAQ entry (Q&A pairs)
  - [ ] Training doc list with delete + status (mock data)
- [ ] P0 · Build Step 3 — `customize/page.tsx`:
  - [ ] Widget color picker (primary color)
  - [ ] Widget position selector (bottom-right, bottom-left)
  - [ ] Avatar uploader (placeholder)
  - [ ] Greeting message textarea
  - [ ] Brand voice selector (Professional, Friendly, Casual, Formal)
  - [ ] Live preview of widget as you customize
- [ ] P0 · Build Step 4 — `channels/page.tsx`:
  - [ ] Channel cards (Web, WhatsApp, SMS, Instagram, Messenger, Email, Slack)
  - [ ] Each card: toggle + "Connect" button that opens setup modal stub
  - [ ] Web channel enabled by default
- [ ] P0 · Build Step 5 — `go-live/page.tsx`:
  - [ ] Success animation (confetti or checkmark)
  - [ ] Embed code snippet with copy button (mock snippet)
  - [ ] "Go to Dashboard" CTA

### 1.5 Dashboard Layout & Shell
- [ ] P0 · Create `dashboard/layout.tsx` — sidebar + header + main content area
- [ ] P0 · Build `DashboardSidebar`:
  - [ ] Logo at top
  - [ ] Nav items: Overview, Conversations, Analytics, Channels, Widget, Training, Settings
  - [ ] Active state highlighting
  - [ ] Collapse to icon-only mode on mobile
  - [ ] Store selector dropdown at bottom (mock stores)
  - [ ] User avatar + name + logout at bottom
- [ ] P0 · Build `DashboardHeader`:
  - [ ] Page title (from context/route)
  - [ ] Global search bar (placeholder, non-functional Phase 1)
  - [ ] Notification bell with badge
  - [ ] User avatar dropdown (profile, settings, logout)
- [ ] P1 · Add keyboard shortcut: `G + C` → Conversations, `G + A` → Analytics, etc.
- [ ] P1 · Add mobile responsive hamburger menu
- [ ] P1 · Create `lib/mock/user.ts` with mock user data
  - [ ] `// TODO: REPLACE WITH API — GET /auth/me`

### 1.6 Dashboard Overview Page
- [ ] P0 · Build `dashboard/page.tsx` overview:
  - [ ] 4 `StatsCard` components (Total Conversations, Revenue Attributed, Handoff Rate, Avg Response Time)
  - [ ] Conversation volume line chart (last 7 days) — Recharts
  - [ ] Channel breakdown donut chart — Recharts
  - [ ] Recent conversations table (5 rows)
  - [ ] Top questions this week list (5 items)
  - [ ] Handoff reasons pie chart
- [ ] P0 · Create `StatsCard` component (icon + label + value + % change indicator)
- [ ] P0 · Create `lib/mock/analytics.ts` with mock analytics data
  - [ ] `// TODO: REPLACE WITH API — GET /stores/:id/analytics/overview`
  - [ ] `// TODO: REPLACE WITH API — GET /stores/:id/analytics/volume`

### 1.7 Conversations Page
- [ ] P0 · Build `conversations/page.tsx`:
  - [ ] Filter bar (All, Active, Handed Off, Resolved, Abandoned)
  - [ ] Channel filter dropdown
  - [ ] Date range picker
  - [ ] Search input
  - [ ] `ConversationList` with paginated rows
- [ ] P0 · Build `ConversationList` component:
  - [ ] Each row: customer name/email, channel icon, last message preview, status badge, timestamp, sentiment indicator
  - [ ] Click row → navigate to conversation detail
  - [ ] Hover state with quick actions (resolve, view)
- [ ] P0 · Build `conversations/[id]/page.tsx`:
  - [ ] Left panel: `MessageThread` — full conversation history
  - [ ] Message bubbles: USER (left), AI (right, with confidence score tooltip), HUMAN_AGENT (right, purple)
  - [ ] Right panel: `CustomerSidebar` (customer info, channel, order history stub)
  - [ ] Bottom: `HandoffPanel` (if status is HANDED_OFF — show summary, trigger, agent notes)
  - [ ] Action buttons: Resolve, Trigger Handoff, Add Note
- [ ] P0 · Create `lib/mock/conversations.ts` with 20+ mock conversations + messages
  - [ ] `// TODO: REPLACE WITH API — GET /stores/:id/conversations`
  - [ ] `// TODO: REPLACE WITH API — GET /stores/:id/conversations/:id`
- [ ] P1 · Build `HandoffPanel` component:
  - [ ] Show AI-generated summary
  - [ ] Show handoff trigger reason (badge)
  - [ ] Show sentiment score (color-coded)
  - [ ] Show what AI already tried
  - [ ] Agent note input field
- [ ] P1 · Add `TypingIndicator` component (three animated dots)
- [ ] P1 · Add real-time message feed stub (shows "Live" badge, polling mock data every 5s)
- [ ] P2 · Add conversation export to CSV button

### 1.8 Analytics Page
- [ ] P0 · Build `analytics/page.tsx`:
  - [ ] Date range selector (7d, 30d, 90d, custom)
  - [ ] Overview metrics row (6 stat cards)
  - [ ] Conversation volume area chart (Recharts)
  - [ ] Revenue attribution bar chart
  - [ ] Channel performance grouped bar chart
  - [ ] Handoff rate trend line chart
  - [ ] Top questions table (question, count, category, handoff rate)
  - [ ] Handoff trigger breakdown table
- [ ] P0 · Create `lib/mock/analytics.ts` extended with chart data
  - [ ] `// TODO: REPLACE WITH API — GET /stores/:id/analytics/volume`
  - [ ] `// TODO: REPLACE WITH API — GET /stores/:id/analytics/channels`
  - [ ] `// TODO: REPLACE WITH API — GET /stores/:id/analytics/questions`
  - [ ] `// TODO: REPLACE WITH API — GET /stores/:id/analytics/handoffs`
- [ ] P1 · Add "Export as CSV" button for each table
- [ ] P1 · Add chart tooltips with formatted values
- [ ] P2 · Add drill-down: click channel bar → filter all charts to that channel

### 1.9 Channels Page
- [ ] P0 · Build `channels/page.tsx` — grid of 7 channel cards
- [ ] P0 · Build `ChannelCard` component:
  - [ ] Channel icon + name + description
  - [ ] Status indicator (Connected / Not Connected / Error)
  - [ ] Active conversations count
  - [ ] "Set Up" / "Manage" / "Disconnect" button
- [ ] P0 · Build `channels/[channel]/page.tsx` — channel setup page:
  - [ ] Channel-specific setup instructions
  - [ ] Config form (varies per channel: phone number, token, webhook URL to copy)
  - [ ] Test connection button (mock success after 2s)
  - [ ] Connection status display
  - [ ] Webhook URL with copy button
- [ ] P1 · Build `WhatsAppSetup` step-by-step wizard (3 steps: Meta App → Phone → Webhook)
- [ ] P1 · Build `SMSSetup` (Twilio: Account SID + Auth Token + Phone Number)
- [ ] P1 · Build `InstagramSetup` (Connect Meta Business Account)
- [ ] P1 · Create `lib/mock/channels.ts` with mock channel statuses
  - [ ] `// TODO: REPLACE WITH API — GET /stores/:id/channels`

### 1.10 Chat Widget
- [ ] P0 · Build `ChatWidget` component (embeddable shell):
  - [ ] Floating button (bottom-right, pulsing dot when active)
  - [ ] Slide-up chat panel (width: 380px)
  - [ ] Header: store logo, name, online indicator, close button
  - [ ] `MessageList` — scrollable message feed
  - [ ] `MessageInput` — textarea + send button + emoji picker (placeholder)
  - [ ] Handoff transition state (spinner + "Connecting you to our team…")
  - [ ] Resolved state ("Conversation ended. Start a new chat?")
- [ ] P0 · Build `widget/page.tsx` — Widget Customizer in dashboard:
  - [ ] Customization panel (colors, avatar, greeting, position, hide branding toggle)
  - [ ] Live preview panel showing `ChatWidget` with current settings
  - [ ] "Get Embed Code" button → dialog with script snippet + copy button
  - [ ] "Preview Full Page" link (opens `/widget-preview`)
- [ ] P0 · Create `app/widget-preview/page.tsx` — blank page with widget embedded
- [ ] P1 · Build `WidgetPreview` component (scaled-down browser mockup showing widget)
- [ ] P1 · Add mock conversation flow in widget preview (auto-plays demo conversation)
- [ ] P2 · Add mobile preview toggle in widget customizer (show mobile vs desktop)

### 1.11 AI Training Manager
- [ ] P0 · Build `training/page.tsx`:
  - [ ] Upload zone (drag-and-drop area, accept PDF/DOCX/TXT/CSV)
  - [ ] URL scraper section (input + "Scrape" button)
  - [ ] Manual FAQ builder (add Q&A pairs form)
  - [ ] Training docs list (table: name, type, status, word count, date, actions)
  - [ ] "Retrain AI" button (full reindex — mock with progress bar)
- [ ] P0 · Build `DocUploadZone` component (react-dropzone integration)
- [ ] P0 · Build `FAQBuilder` component (add, edit, delete Q&A pairs)
- [ ] P1 · Build `TrainingDocRow` component (with toggle active/inactive, delete)
- [ ] P1 · Build `RetrainProgressModal` — modal showing indexing progress (mock 5-step process)
- [ ] P1 · Create `lib/mock/training.ts` with mock training docs
  - [ ] `// TODO: REPLACE WITH API — GET /stores/:id/training`
  - [ ] `// TODO: REPLACE WITH API — POST /stores/:id/training`

### 1.12 Settings Pages
- [ ] P0 · Build `settings/page.tsx` — General settings:
  - [ ] Store name, domain, platform (read-only), plan tier
  - [ ] Time zone selector
  - [ ] Business hours (open/close times per day of week)
  - [ ] Delete store (danger zone, confirm dialog)
- [ ] P0 · Build `settings/escalation/page.tsx` — Escalation rule builder:
  - [ ] Confidence threshold slider (0.0–1.0, default 0.65) with explainer
  - [ ] Handoff destination selector (Live Agent / Zendesk / Gorgias / Freshdesk / Email)
  - [ ] High-value cart threshold (USD input)
  - [ ] Custom trigger rules (keyword → route to human)
  - [ ] After-hours behavior (create ticket / send ETA / custom message)
  - [ ] Connected helpdesk integrations (API key inputs with test button)
- [ ] P0 · Build `settings/team/page.tsx` — Team management:
  - [ ] Agent list table (name, email, role, status, last active)
  - [ ] "Invite Agent" form (email + role selector)
  - [ ] Remove agent (confirm dialog)
- [ ] P1 · Build `settings/billing/page.tsx` — Billing:
  - [ ] Current plan card with usage bars (conversations used/limit)
  - [ ] Plan upgrade cards (mock, non-functional Phase 1)
  - [ ] Billing history table (mock invoices)
  - [ ] Payment method display (placeholder)
- [ ] P1 · Build `settings/api/page.tsx` — API Keys:
  - [ ] Active API keys list
  - [ ] Generate new key form
  - [ ] Revoke key button
- [ ] P2 · Add notification preferences section (email digest settings)

---

## PHASE 2 — Backend (Real API, Real Data)

### 2.1 Database
- [ ] P0 · Write full Prisma schema (all models from ARCHITECTURE.md)
- [ ] P0 · Enable `pgvector` extension in PostgreSQL
- [ ] P0 · Create initial migration (`prisma migrate dev --name init`)
- [ ] P0 · Create database seed script with realistic sample data
- [ ] P1 · Add database indexes (conversations.storeId, messages.conversationId, training docs store + embedding)
- [ ] P1 · Set up Prisma middleware for soft-deletes
- [ ] P2 · Write database backup strategy docs

### 2.2 Auth Service
- [ ] P0 · `POST /auth/register` — hash password (bcrypt), create user, return tokens
- [ ] P0 · `POST /auth/login` — validate credentials, return access token + set refresh cookie
- [ ] P0 · `POST /auth/refresh` — validate refresh token cookie, return new access token
- [ ] P0 · `POST /auth/logout` — invalidate refresh token in DB
- [ ] P0 · Auth middleware — validate JWT, attach user to `req.user`
- [ ] P0 · `GET /auth/me` — return current user + their stores
- [ ] P1 · `POST /auth/forgot-password` — generate reset token, send email via Postmark
- [ ] P1 · `POST /auth/reset-password` — validate token, update password hash
- [ ] P1 · Store ownership middleware — validate user owns the store in route params
- [ ] P2 · Add email verification flow
- [ ] P2 · Add 2FA (TOTP) support

### 2.3 Store & Settings API
- [ ] P0 · `GET /stores` — list user's stores
- [ ] P0 · `POST /stores` — create store (validate plan limits)
- [ ] P0 · `GET /stores/:id` — get store details
- [ ] P0 · `PATCH /stores/:id` — update store
- [ ] P0 · `DELETE /stores/:id` — soft delete store
- [ ] P0 · `GET /stores/:id/settings` — get store settings
- [ ] P0 · `PATCH /stores/:id/settings` — update settings (encrypt sensitive fields)

### 2.4 Conversation & Message API
- [ ] P0 · `GET /stores/:id/conversations` — paginated list with filters (status, channel, date, search)
- [ ] P0 · `GET /stores/:id/conversations/:convId` — full conversation with messages
- [ ] P0 · `PATCH /stores/:id/conversations/:convId` — update status
- [ ] P0 · `POST /stores/:id/conversations/:convId/handoff` — trigger manual handoff
- [ ] P1 · `GET /stores/:id/conversations` — cursor-based pagination for performance
- [ ] P1 · Add full-text search on message content

### 2.5 Analytics API
- [ ] P0 · `GET /stores/:id/analytics/overview` — aggregate totals
- [ ] P0 · `GET /stores/:id/analytics/volume` — daily conversation counts for date range
- [ ] P1 · `GET /stores/:id/analytics/channels` — per-channel breakdown
- [ ] P1 · `GET /stores/:id/analytics/questions` — cluster top questions using embeddings
- [ ] P1 · `GET /stores/:id/analytics/handoffs` — handoff trends + trigger breakdown
- [ ] P2 · Add server-side caching (Redis) for expensive aggregation queries

### 2.6 Channel API
- [ ] P0 · `GET /stores/:id/channels` — list channels + status
- [ ] P0 · `POST /stores/:id/channels` — add channel (encrypt tokens)
- [ ] P0 · `PATCH /stores/:id/channels/:channelId` — update config
- [ ] P0 · `DELETE /stores/:id/channels/:channelId` — remove channel
- [ ] P1 · `POST /stores/:id/channels/:channelId/test` — test connection to channel API

### 2.7 Training & RAG API
- [ ] P0 · `GET /stores/:id/training` — list training docs
- [ ] P0 · `POST /stores/:id/training` — upload doc → extract text → generate embedding → store
- [ ] P0 · `PATCH /stores/:id/training/:docId` — update doc (re-embed if content changed)
- [ ] P0 · `DELETE /stores/:id/training/:docId` — delete doc + embedding
- [ ] P0 · `POST /stores/:id/training/retrain` — re-embed all docs (BullMQ async job)
- [ ] P1 · URL scraper service — fetch URL → extract clean text → embed
- [ ] P1 · PDF/DOCX text extraction (pdf-parse, mammoth)
- [ ] P2 · Automatic re-training when product catalog updates (webhook from store platform)

### 2.8 AI Service
- [ ] P0 · OpenAI client singleton with retry logic
- [ ] P0 · Embedding function (`embedText(text) → number[]`) using `text-embedding-3-small`
- [ ] P0 · RAG retrieval function (pgvector similarity search, k=5, threshold=0.78)
- [ ] P0 · Prompt builder (system + store settings + retrieved docs + history + message)
- [ ] P0 · GPT-4o completion with streaming support
- [ ] P0 · Confidence score engine:
  - [ ] Factual confidence (based on retrieved doc relevance scores)
  - [ ] Intent clarity score (secondary GPT-4o mini classification call)
  - [ ] Emotional state score (sentiment analysis on customer message)
  - [ ] Composite score calculation
- [ ] P1 · Response post-processor (extract product references, order data needs, discount triggers)
- [ ] P1 · Token usage tracker (log per conversation, enforce plan limits)
- [ ] P2 · Response caching (Redis) for identical/near-identical questions

### 2.9 Public Widget API
- [ ] P0 · `GET /widget/:storeId/config` — return widget appearance config (public, no auth)
- [ ] P0 · `POST /widget/:storeId/conversation` — start new conversation, return convId + sessionToken
- [ ] P0 · `POST /widget/:storeId/message` — send message → trigger AI → return response
- [ ] P0 · Rate limit public widget endpoints (per storeId + per IP)
- [ ] P1 · Session token management (anonymous customer sessions, 24h expiry)
- [ ] P1 · Plan limit enforcement (reject if store over conversation limit)

### 2.10 Webhook Handlers
- [ ] P1 · `POST /webhooks/whatsapp` — verify Meta signature, parse message, route to AI service
- [ ] P1 · `POST /webhooks/instagram` — verify Meta signature, handle DM events
- [ ] P1 · `POST /webhooks/messenger` — verify Meta signature, handle page messages
- [ ] P1 · `POST /webhooks/sms` — Twilio signature validation, parse inbound SMS
- [ ] P2 · `POST /webhooks/email` — Postmark inbound, parse sender + body, thread by email

### 2.11 Human Handoff Service
- [ ] P0 · Handoff trigger detector (runs on every AI response, checks confidence)
- [ ] P0 · Handoff record creator (save trigger reason, AI summary, sentiment score)
- [ ] P0 · AI-generated handoff summary (second GPT call to summarize conversation for agent)
- [ ] P0 · Customer notification (send "connecting you" message to customer)
- [ ] P1 · Zendesk integration (create ticket with conversation summary via API)
- [ ] P1 · Gorgias integration (create ticket)
- [ ] P1 · Freshdesk integration (create ticket)
- [ ] P1 · After-hours handler (detect outside business hours → create ticket + send ETA)
- [ ] P2 · Learning loop (nightly BullMQ job processes resolved handoffs → create training docs)

### 2.12 Real-time Layer
- [ ] P1 · Socket.io server setup with auth middleware (validate JWT on connection)
- [ ] P1 · Room management (merchant joins room for their storeId)
- [ ] P1 · Emit `conversation:new` on new conversation
- [ ] P1 · Emit `message:new` on new message (AI or human)
- [ ] P1 · Emit `handoff:triggered` when handoff fires
- [ ] P2 · Agent presence system (show who's viewing which conversation)

---

## PHASE 3 — Integration (Wire Frontend to Backend)

> Replace all `// TODO: REPLACE WITH API` mock data with real API calls

### 3.1 API Client Setup
- [ ] P0 · Create `lib/api/client.ts` — Axios instance with base URL, auth header injection, refresh token interceptor
- [ ] P0 · Create typed API functions for all endpoints (one file per resource)
- [ ] P0 · Set up TanStack Query hooks for all data fetching
- [ ] P0 · Implement optimistic updates for common mutations (resolve conversation, etc.)

### 3.2 Auth Integration
- [ ] P0 · Wire login form → `POST /auth/login` → store token → redirect to dashboard
- [ ] P0 · Wire signup form → `POST /auth/register` → auto-login → onboarding
- [ ] P0 · Implement auth guard (redirect to login if no valid token)
- [ ] P0 · Implement token refresh interceptor (auto-refresh on 401)
- [ ] P0 · Wire logout → `POST /auth/logout` → clear token → redirect to login
- [ ] P1 · Wire forgot password + reset password forms

### 3.3 Dashboard Integration
- [ ] P0 · Replace mock analytics with `GET /stores/:id/analytics/overview`
- [ ] P0 · Replace mock conversations with `GET /stores/:id/conversations`
- [ ] P0 · Replace mock conversation detail with `GET /stores/:id/conversations/:id`
- [ ] P0 · Wire handoff trigger button → `POST /stores/:id/conversations/:id/handoff`
- [ ] P0 · Wire conversation resolve → `PATCH /stores/:id/conversations/:id`
- [ ] P1 · Replace all analytics charts with real API data
- [ ] P1 · Replace channel list with `GET /stores/:id/channels`
- [ ] P1 · Wire channel setup forms → `POST/PATCH /stores/:id/channels`
- [ ] P1 · Replace training docs with `GET /stores/:id/training`
- [ ] P1 · Wire file upload → `POST /stores/:id/training`
- [ ] P1 · Replace settings with real `GET/PATCH /stores/:id/settings`

### 3.4 Widget Integration
- [ ] P0 · Wire widget config → `GET /widget/:storeId/config`
- [ ] P0 · Wire conversation start → `POST /widget/:storeId/conversation`
- [ ] P0 · Wire message send → `POST /widget/:storeId/message`
- [ ] P1 · Connect widget to Socket.io for real-time AI responses

### 3.5 Real-time Integration
- [ ] P1 · Connect dashboard to Socket.io
- [ ] P1 · Implement `conversation:new` → add to conversation list without refresh
- [ ] P1 · Implement `message:new` → append to open conversation thread
- [ ] P1 · Implement `handoff:triggered` → show toast notification + badge in sidebar
- [ ] P1 · Implement agent takeover flow (join conversation → send as human)

---

## PHASE 4 — Polish & Quality

### 4.1 Testing
- [ ] P1 · Set up Jest + Testing Library for frontend unit tests
- [ ] P1 · Write tests for all utility functions
- [ ] P1 · Write tests for confidence score engine
- [ ] P1 · Write tests for auth middleware
- [ ] P1 · Write tests for API route handlers (mock Prisma)
- [ ] P2 · Set up Playwright E2E tests
- [ ] P2 · E2E: signup → onboarding → dashboard flow
- [ ] P2 · E2E: send message in widget → receive AI response
- [ ] P2 · E2E: trigger handoff → see in dashboard

### 4.2 Performance
- [ ] P1 · Add Next.js Image optimization for all images
- [ ] P1 · Add React.lazy + Suspense for heavy dashboard components
- [ ] P1 · Add Redis caching for analytics queries (5min TTL)
- [ ] P2 · Implement conversation list virtualization (react-window) for large lists
- [ ] P2 · Add database query explain analysis for slow queries

### 4.3 Security Audit
- [ ] P0 · Verify all API routes require auth (except /auth and /widget and /webhooks)
- [ ] P0 · Verify store ownership check on every /stores/:id route
- [ ] P0 · Verify webhook signature validation on all webhook handlers
- [ ] P0 · Verify no secrets in logs (winston scrubber configured)
- [ ] P1 · Run `npm audit` and resolve critical/high vulnerabilities
- [ ] P1 · Add Content Security Policy headers
- [ ] P1 · Add rate limiting to auth endpoints (5 attempts / 15min)
- [ ] P2 · Penetration test auth flow (basic)

### 4.4 Accessibility
- [ ] P1 · Audit all interactive components for keyboard navigation
- [ ] P1 · Add `aria-label` to all icon buttons
- [ ] P1 · Ensure color contrast ratio ≥ 4.5:1 (WCAG AA)
- [ ] P1 · Test with screen reader (VoiceOver / NVDA)
- [ ] P2 · Add skip-to-content link
- [ ] P2 · Fix all axe-core violations

---

## PHASE 5 — Launch Prep

### 5.1 Deployment
- [ ] P0 · Deploy frontend to Vercel (connect GitHub repo, configure env vars)
- [ ] P0 · Deploy backend to Railway (Dockerfile + env vars)
- [ ] P0 · Provision Supabase project (PostgreSQL + enable pgvector)
- [ ] P0 · Provision Upstash Redis
- [ ] P0 · Configure custom domain (convix.ai or chosen domain)
- [ ] P0 · Set up SSL certificates (auto via Vercel + Railway)
- [ ] P1 · Configure GitHub Actions CD for auto-deploy on merge to main
- [ ] P1 · Set up error monitoring (Sentry — frontend + backend)
- [ ] P1 · Set up uptime monitoring (Better Uptime or Checkly)
- [ ] P2 · Set up log aggregation (Datadog or Logtail)

### 5.2 Payments
- [ ] P1 · Integrate Stripe (subscription products for 4 plan tiers)
- [ ] P1 · Build Stripe checkout flow from pricing page
- [ ] P1 · Build Stripe customer portal (manage subscription, cancel)
- [ ] P1 · Handle Stripe webhooks (subscription created/updated/cancelled)
- [ ] P1 · Enforce plan limits (conversation count) in API

### 5.3 Docs & Legal
- [ ] P1 · Write `README.md` with full setup instructions for contributors
- [ ] P2 · Write Privacy Policy page
- [ ] P2 · Write Terms of Service page
- [ ] P2 · Write API documentation (Swagger/OpenAPI spec)
- [ ] P2 · Write help docs for each channel setup (WhatsApp, SMS, Instagram, etc.)

---

## Ongoing / Backlog

- [ ] P2 · TikTok Shop channel integration
- [ ] P2 · Slack channel integration (B2B)
- [ ] P2 · Shopify App Store listing
- [ ] P2 · WooCommerce plugin (ZIP installer)
- [ ] P2 · White-label mode (agency plan — remove Convix branding)
- [ ] P2 · Multi-language widget support (auto-detect customer locale)
- [ ] P2 · A/B testing for AI response styles
- [ ] P2 · Performance-based pricing tier (pay % of attributed revenue)
- [ ] P2 · Product recommendation engine (cross-sell / upsell logic)
- [ ] P2 · Cart recovery campaign manager (WhatsApp message sequences)
- [ ] P2 · Chrome extension for human agents (see Convix context in any tab)
- [ ] P2 · Mobile app for agents (React Native — monitor + respond to handoffs)

---

## Task Count Summary

| Phase | Total Tasks | P0 | P1 | P2 |
|---|---|---|---|---|
| Phase 0 — Setup | 33 | 20 | 10 | 3 |
| Phase 1 — Frontend | 112 | 58 | 41 | 13 |
| Phase 2 — Backend | 71 | 32 | 28 | 11 |
| Phase 3 — Integration | 28 | 14 | 14 | 0 |
| Phase 4 — Polish | 26 | 5 | 16 | 5 |
| Phase 5 — Launch | 22 | 8 | 10 | 4 |
| Backlog | 14 | 0 | 0 | 14 |
| **TOTAL** | **306** | **137** | **119** | **50** |

---

*Last updated: Phase 0 — not started*
*Next action: Run Phase 0 setup tasks (repo init, Next.js scaffold, backend scaffold)*
