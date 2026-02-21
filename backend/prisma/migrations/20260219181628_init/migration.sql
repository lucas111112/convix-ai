-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('STARTER', 'BUILDER', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DRAFT');

-- CreateEnum
CREATE TYPE "AgentMode" AS ENUM ('TEXT', 'VOICE', 'BOTH');

-- CreateEnum
CREATE TYPE "HandoffDest" AS ENUM ('NONE', 'LIVE_AGENT', 'ZENDESK', 'FRESHDESK', 'GORGIAS', 'EMAIL_QUEUE');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('WEB', 'WHATSAPP', 'TELEGRAM', 'MESSENGER', 'SLACK', 'SMS', 'VOICE', 'EMAIL');

-- CreateEnum
CREATE TYPE "KnowledgeType" AS ENUM ('TEXT', 'URL', 'PDF', 'QA', 'YOUTUBE', 'SITEMAP');

-- CreateEnum
CREATE TYPE "KnowledgeStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'ERROR');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'HANDED_OFF', 'RESOLVED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM', 'HUMAN_AGENT');

-- CreateEnum
CREATE TYPE "HandoffTrigger" AS ENUM ('LOW_CONFIDENCE', 'ANGER_DETECTED', 'EXPLICIT_REQUEST', 'POLICY_RULE', 'BUSINESS_HOURS');

-- CreateEnum
CREATE TYPE "CreditReason" AS ENUM ('PLAN_GRANT', 'TOPUP_PURCHASE', 'MESSAGE_CONSUMED', 'VOICE_CONSUMED', 'TAGGING_CONSUMED', 'REFUND');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'STARTER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stripeCustomerId" TEXT,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT NOT NULL DEFAULT '🤖',
    "systemPrompt" TEXT NOT NULL,
    "status" "AgentStatus" NOT NULL DEFAULT 'INACTIVE',
    "mode" "AgentMode" NOT NULL DEFAULT 'TEXT',
    "voiceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "ttsVoice" TEXT,
    "handoffEnabled" BOOLEAN NOT NULL DEFAULT false,
    "handoffThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.65,
    "handoffDest" "HandoffDest" NOT NULL DEFAULT 'NONE',
    "routingPolicy" TEXT,
    "businessHours" JSONB,
    "customFields" JSONB,
    "taggingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "availableTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channels" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "ChannelType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "credentials" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_channels" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "agent_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "widget_configs" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL DEFAULT '#6d28d9',
    "theme" TEXT NOT NULL DEFAULT 'light',
    "greeting" TEXT NOT NULL DEFAULT 'Hi! How can I help?',
    "position" TEXT NOT NULL DEFAULT 'bottom-right',
    "cornerRadius" INTEGER NOT NULL DEFAULT 16,
    "shadow" TEXT NOT NULL DEFAULT 'soft',
    "headerTitle" TEXT NOT NULL DEFAULT 'Axon AI',
    "inputPlaceholder" TEXT NOT NULL DEFAULT 'Type a message…',
    "streaming" BOOLEAN NOT NULL DEFAULT true,
    "template" TEXT NOT NULL DEFAULT 'bubble',

    CONSTRAINT "widget_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_docs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "type" "KnowledgeType" NOT NULL,
    "title" TEXT NOT NULL,
    "status" "KnowledgeStatus" NOT NULL DEFAULT 'PENDING',
    "sourceUrl" TEXT,
    "storageKey" TEXT,
    "rawContent" TEXT,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_docs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_chunks" (
    "id" TEXT NOT NULL,
    "docId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536),
    "chunkIdx" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "channelType" "ChannelType" NOT NULL,
    "externalId" TEXT,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "sentiment" DOUBLE PRECISION,
    "intentScore" DOUBLE PRECISION,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "latencyMs" INTEGER,
    "tokens" INTEGER,
    "channelMsgId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handoffs" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "trigger" "HandoffTrigger" NOT NULL,
    "confidence" DOUBLE PRECISION,
    "summary" TEXT NOT NULL,
    "destination" "HandoffDest" NOT NULL,
    "externalTicketId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "learningNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "handoffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_rollups" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "agentId" TEXT,
    "date" DATE NOT NULL,
    "totalMessages" INTEGER NOT NULL DEFAULT 0,
    "totalConversations" INTEGER NOT NULL DEFAULT 0,
    "handoffs" INTEGER NOT NULL DEFAULT 0,
    "resolved" INTEGER NOT NULL DEFAULT 0,
    "avgLatencyMs" INTEGER NOT NULL DEFAULT 0,
    "p95LatencyMs" INTEGER NOT NULL DEFAULT 0,
    "voiceMinutes" INTEGER NOT NULL DEFAULT 0,
    "creditsConsumed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "analytics_rollups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_ledger" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" "CreditReason" NOT NULL,
    "refId" TEXT,
    "balance" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_stripeCustomerId_key" ON "workspaces"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_userId_workspaceId_key" ON "workspace_members"("userId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "agents_workspaceId_idx" ON "agents"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "channels_workspaceId_type_key" ON "channels"("workspaceId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "agent_channels_agentId_channelId_key" ON "agent_channels"("agentId", "channelId");

-- CreateIndex
CREATE UNIQUE INDEX "widget_configs_agentId_key" ON "widget_configs"("agentId");

-- CreateIndex
CREATE INDEX "knowledge_docs_agentId_idx" ON "knowledge_docs"("agentId");

-- CreateIndex
CREATE INDEX "knowledge_chunks_docId_idx" ON "knowledge_chunks"("docId");

-- CreateIndex
CREATE INDEX "conversations_workspaceId_createdAt_idx" ON "conversations"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "conversations_agentId_idx" ON "conversations"("agentId");

-- CreateIndex
CREATE INDEX "conversations_customerId_idx" ON "conversations"("customerId");

-- CreateIndex
CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "handoffs_conversationId_idx" ON "handoffs"("conversationId");

-- CreateIndex
CREATE INDEX "analytics_rollups_workspaceId_date_idx" ON "analytics_rollups"("workspaceId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_rollups_workspaceId_agentId_date_key" ON "analytics_rollups"("workspaceId", "agentId", "date");

-- CreateIndex
CREATE INDEX "credit_ledger_workspaceId_createdAt_idx" ON "credit_ledger"("workspaceId", "createdAt");

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_channels" ADD CONSTRAINT "agent_channels_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_channels" ADD CONSTRAINT "agent_channels_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "widget_configs" ADD CONSTRAINT "widget_configs_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_docs" ADD CONSTRAINT "knowledge_docs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_docs" ADD CONSTRAINT "knowledge_docs_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_docId_fkey" FOREIGN KEY ("docId") REFERENCES "knowledge_docs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handoffs" ADD CONSTRAINT "handoffs_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_rollups" ADD CONSTRAINT "analytics_rollups_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
