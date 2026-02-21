import * as Sentry from '@sentry/node';
import OpenAI from 'openai';
import { openai } from '../../config/openai';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { AppError } from '../../lib/errors';
import { embed } from './embed.service';
import { socketService } from '../realtime/socket.service';
import { Resend } from 'resend';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface InboundMessage {
  workspaceId: string;
  agentId: string;
  channelType: string;
  externalId: string;
  customerId: string;
  customerName?: string;
  content: string;
  metadata?: Record<string, unknown>;
  isVoiceCall?: boolean;
}

export interface PipelineResult {
  conversationId: string;
  message: {
    id: string;
    role: string;
    content: string;
    confidence: number;
    latencyMs: number;
    tokens?: number;
  };
}

interface ConfidenceScores {
  factual: number;
  intent: number;
  emotional: number;
  composite: number;
}

type ChatCompletionInput = Omit<
  OpenAI.ChatCompletionCreateParams,
  'max_tokens' | 'max_completion_tokens'
>;
type StreamingCompletion = AsyncIterable<OpenAI.ChatCompletionChunk>;
type StreamingParams = OpenAI.ChatCompletionCreateParamsStreaming;
type NonStreamingParams = OpenAI.ChatCompletionCreateParamsNonStreaming;
type CompletionResponse = OpenAI.ChatCompletion;

async function createCompletion(
  request: NonStreamingParams,
): Promise<CompletionResponse> {
  return openai.chat.completions.create(request) as Promise<CompletionResponse>;
}

async function createCompletionStream(
  request: StreamingParams,
): Promise<StreamingCompletion> {
  return openai.chat.completions.create(request) as Promise<StreamingCompletion>;
}

function isGpt5Model(model: string): boolean {
  return /^gpt-5/i.test(model);
}

function withTokenBudget(
  request: ChatCompletionInput,
  maxTokens: number,
): OpenAI.ChatCompletionCreateParams {
  if (isGpt5Model(request.model)) {
    return {
      ...request,
      max_completion_tokens: maxTokens,
    };
  }

  return {
    ...request,
    max_tokens: maxTokens,
  };
}

// ─────────────────────────────────────────────────────────────────
// Handoff patterns
// ─────────────────────────────────────────────────────────────────

const HANDOFF_PATTERNS = [
  /speak.*to.*(?:a |an )?(human|person|agent|representative|rep)/i,
  /talk.*to.*(?:a |an )?(human|person|agent|representative|rep)/i,
  /(?:real|actual|live)\s+(person|human|agent)/i,
  /connect.*(?:human|agent)/i,
  /escalate/i,
  /transfer.*(?:me|call)/i,
];

// ─────────────────────────────────────────────────────────────────
// Public entry points
// ─────────────────────────────────────────────────────────────────

export async function runPipeline(inbound: InboundMessage): Promise<PipelineResult> {
  return _executePipeline(inbound, false, null);
}

export async function runPipelineStream(
  inbound: InboundMessage,
  onDelta: (text: string) => void,
): Promise<PipelineResult> {
  return _executePipeline(inbound, true, onDelta);
}

// ─────────────────────────────────────────────────────────────────
// Core pipeline
// ─────────────────────────────────────────────────────────────────

async function _executePipeline(
  inbound: InboundMessage,
  streaming: boolean,
  onDelta: ((text: string) => void) | null,
): Promise<PipelineResult> {
  const startMs = Date.now();

  // ── 0. Load agent early — check status before creating conversation ──
  const agent = await prisma.agent.findUnique({ where: { id: inbound.agentId } });
  if (!agent) {
    throw new AppError('AGENT_NOT_FOUND', 404, 'Agent not found');
  }

  // ── 0a. Disabled agent guard ───────────────────────────────────
  if (agent.status === 'INACTIVE') {
    const disabledContent = 'This agent is currently disabled and cannot respond to messages.';
    return {
      conversationId: `disabled-${inbound.agentId}`,
      message: {
        id: `disabled-${Date.now()}`,
        role: 'ASSISTANT',
        content: disabledContent,
        confidence: 1.0,
        latencyMs: 0,
      },
    };
  }

  // ── 1. Resolve / create conversation, persist user message ────
  const { conversation } = await resolveConversation(inbound);

  // ── 1a. Business hours check ───────────────────────────────────
  if (agent.businessHours) {
    const bh = agent.businessHours as any;
    if (bh?.enabled && !isWithinBusinessHours(bh)) {
      const oohContent = bh?.closedMessage
        ?? 'Thank you for reaching out! We\'re currently outside our business hours. Please try again during our business hours or send us an email and we\'ll respond as soon as we\'re back.';
      const oohMsg = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'ASSISTANT',
          content: oohContent,
          confidence: 1.0,
          latencyMs: 1,
          tokens: 0,
        },
      });
      socketService.emitToConversation(conversation.id, 'message:new', {
        id: oohMsg.id,
        role: 'ASSISTANT',
        content: oohContent,
        confidence: 1.0,
        latencyMs: 1,
        conversationId: conversation.id,
        createdAt: oohMsg.createdAt,
      });
      socketService.emitToWorkspace(inbound.workspaceId, 'conversation:updated', {
        conversationId: conversation.id,
        lastMessage: oohContent.slice(0, 120),
        updatedAt: new Date(),
      });
      return {
        conversationId: conversation.id,
        message: { id: oohMsg.id, role: 'ASSISTANT', content: oohContent, confidence: 1.0, latencyMs: 1 },
      };
    }
  }

  // ── 3. Credits pre-check ──────────────────────────────────────
  try {
    const { checkLowCredits } = await import('../billing/credit.service');
    await checkLowCredits(inbound.workspaceId);
  } catch (err) {
    logger.warn({ err }, 'Credit pre-check failed');
  }

  // ── 4. RAG retrieval ──────────────────────────────────────────
  const contextChunks = await retrieveContext(inbound.agentId, inbound.content);

  // ── 5. Load conversation history ──────────────────────────────
  const rawHistory = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'asc' },
    select: { role: true, content: true },
  });
  // Exclude the message we just persisted (last one)
  const history = rawHistory.slice(0, -1);

  // ── 6. Build prompt ───────────────────────────────────────────
  const messages = buildPrompt({ agent, contextChunks, history, userMessage: inbound.content, isVoiceCall: inbound.isVoiceCall });

  // ── 7. LLM completion ────────────────────────────────────────
  let aiContent = '';
  let totalTokens = 0;

  if (streaming && onDelta) {
    const stream = await createCompletionStream(
      withTokenBudget(
        {
          model: env.OPENAI_MODEL,
          messages,
          stream: true,
          temperature: 0.4,
        },
        1024,
      ) as StreamingParams,
    );

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? '';
      if (delta) {
        aiContent += delta;
        onDelta(delta);
      }
      if (chunk.usage) {
        totalTokens = chunk.usage.total_tokens;
      }
    }
  } else {
    const completion = await createCompletion(
      withTokenBudget(
        {
          model: env.OPENAI_MODEL,
          messages,
          stream: false,
          temperature: 0.4,
        },
        1024,
      ) as NonStreamingParams,
    );
    aiContent = completion.choices[0]?.message?.content ?? '';
    totalTokens = completion.usage?.total_tokens ?? 0;
  }

  const latencyMs = Date.now() - startMs;

  // ── 8. Confidence scoring ─────────────────────────────────────
  const confidence = await scoreConfidence(inbound.content, aiContent, contextChunks);

  // ── 9. Handoff decision ───────────────────────────────────────
  const shouldHandoff = decideHandoff(agent, confidence, inbound.content);

  // ── 10. Persist assistant message ─────────────────────────────
  const assistantMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: 'ASSISTANT',
      content: aiContent,
      confidence: confidence.composite,
      latencyMs,
      tokens: totalTokens,
    },
  });

  // ── 11. Deduct credits ────────────────────────────────────────
  try {
    const { deductCredits } = await import('../billing/credit.service');
    const { CreditReason } = await import('@prisma/client');
    await deductCredits(inbound.workspaceId, 1, CreditReason.MESSAGE_CONSUMED, conversation.id);
  } catch (err) {
    logger.error({ err, workspaceId: inbound.workspaceId, conversationId: conversation.id }, 'Credit deduction failed');
    Sentry.captureException(err, { extra: { workspaceId: inbound.workspaceId, conversationId: conversation.id } });
  }

  // ── 12. Auto-tagging ──────────────────────────────────────────
  if (agent.taggingEnabled && agent.availableTags.length > 0 && confidence.composite >= 0.6) {
    void _autoTag(conversation.id, inbound.content, aiContent, agent.availableTags, inbound.workspaceId).catch(
      (err) => logger.warn({ err }, 'Auto-tagging failed (non-fatal)'),
    );
  }

  // ── 13. Emit socket events ────────────────────────────────────
  socketService.emitToConversation(conversation.id, 'message:new', {
    id: assistantMessage.id,
    role: 'ASSISTANT',
    content: aiContent,
    confidence: confidence.composite,
    latencyMs,
    conversationId: conversation.id,
    createdAt: assistantMessage.createdAt,
  });

  socketService.emitToWorkspace(inbound.workspaceId, 'conversation:updated', {
    conversationId: conversation.id,
    lastMessage: aiContent.slice(0, 120),
    updatedAt: new Date(),
  });

  // ── 14. Trigger handoff if needed ─────────────────────────────
  if (shouldHandoff) {
    void _triggerHandoff({
      agent,
      conversation,
      confidence,
      userMessage: inbound.content,
      aiResponse: aiContent,
    }).catch((err) => {
      logger.error({ err, conversationId: conversation.id }, 'Handoff trigger failed');
      Sentry.captureException(err);
    });
  }

  return {
    conversationId: conversation.id,
    message: {
      id: assistantMessage.id,
      role: 'ASSISTANT',
      content: aiContent,
      confidence: confidence.composite,
      latencyMs,
      tokens: totalTokens,
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// Conversation resolver
// ─────────────────────────────────────────────────────────────────

async function resolveConversation(
  msg: InboundMessage,
): Promise<{ conversation: NonNullable<Awaited<ReturnType<typeof prisma.conversation.findFirst>>>; userMessage: any }> {
  // Find open conversation for this customer on this channel
  let conversation = await prisma.conversation.findFirst({
    where: {
      workspaceId: msg.workspaceId,
      agentId: msg.agentId,
      channelType: msg.channelType as any,
      customerId: msg.customerId,
      status: { in: ['OPEN', 'HANDED_OFF'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        workspaceId: msg.workspaceId,
        agentId: msg.agentId,
        channelType: msg.channelType as any,
        externalId: msg.externalId,
        customerId: msg.customerId,
        customerName: msg.customerName,
        status: 'OPEN',
        metadata: msg.metadata ? (msg.metadata as any) : undefined,
      },
    });

    socketService.emitToWorkspace(msg.workspaceId, 'conversation:new', {
      conversationId: conversation.id,
      channelType: msg.channelType,
      customerId: msg.customerId,
      customerName: msg.customerName,
      createdAt: conversation.createdAt,
    });
  }

  // Persist user message
  const userMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: 'USER',
      content: msg.content,
    },
  });

  socketService.emitToConversation(conversation.id, 'message:new', {
    id: userMessage.id,
    role: 'USER',
    content: msg.content,
    conversationId: conversation.id,
    createdAt: userMessage.createdAt,
  });

  return { conversation, userMessage };
}

// ─────────────────────────────────────────────────────────────────
// RAG retrieval
// ─────────────────────────────────────────────────────────────────

async function retrieveContext(agentId: string, query: string): Promise<string[]> {
  try {
    const vec = await embed(query);
    const vectorStr = `[${vec.join(',')}]`;

    const chunks = await prisma.$queryRaw<Array<{ content: string; similarity: number }>>`
      SELECT kc.content, 1 - (kc.embedding <=> ${vectorStr}::vector) AS similarity
      FROM knowledge_chunks kc
      JOIN knowledge_docs kd ON kc.doc_id = kd.id
      WHERE kd.agent_id = ${agentId}
        AND kd.is_active = true
        AND kd.status = 'READY'
        AND 1 - (kc.embedding <=> ${vectorStr}::vector) > 0.78
      ORDER BY kc.embedding <=> ${vectorStr}::vector
      LIMIT 5
    `;

    return chunks.map((c) => c.content);
  } catch (err) {
    logger.warn({ err, agentId }, 'RAG retrieval failed (non-fatal)');
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────
// Prompt builder
// ─────────────────────────────────────────────────────────────────

function buildPrompt(params: {
  agent: any;
  contextChunks: string[];
  history: any[];
  userMessage: string;
  isVoiceCall?: boolean;
}): OpenAI.ChatCompletionMessageParam[] {
  const { agent, contextChunks, history, userMessage, isVoiceCall } = params;

  // Build system content
  const systemParts: string[] = [];

  // Core agent instructions (user-defined)
  systemParts.push(agent.systemPrompt);

  // Support-focused base instructions
  systemParts.push(`\n\n## Core Behaviour\nYou are a customer support AI. Be concise, accurate, and empathetic. Never guess — if unsure, say so and offer to escalate. Do not reveal your underlying AI model, provider, or technical architecture. If asked what model you are, say you are a custom AI assistant built for this service.`);

  // Voice call context injection
  if (isVoiceCall) {
    systemParts.push(`\n\n## Voice Call Mode\nYou are currently in a live voice call with the customer. Keep responses short and conversational — 1-3 sentences maximum. Avoid lists, markdown, or formatting. Speak naturally as if in a phone conversation.`);
  }

  // Routing policy (user-defined text)
  if (agent.routingPolicy) {
    systemParts.push(`\n\n## Human Escalation Policy\n${agent.routingPolicy}`);
  }

  // Support email for human escalation
  if (agent.supportEmail) {
    systemParts.push(`\n\nWhen directing a customer to a human agent, tell them they can email: ${agent.supportEmail}`);
  }

  if (contextChunks.length > 0) {
    systemParts.push(
      `\n\n## Relevant Knowledge Base\nUse the following context to answer accurately:\n\n${contextChunks
        .map((c, i) => `[${i + 1}] ${c}`)
        .join('\n\n')}`,
    );
  }

  const systemMessage: OpenAI.ChatCompletionMessageParam = {
    role: 'system',
    content: systemParts.join(''),
  };

  // Trim history to max 8 turns and ~4K tokens
  const trimmed = trimHistory(history, 4000);

  const historyMessages: OpenAI.ChatCompletionMessageParam[] = trimmed.map((m: any) => ({
    role: m.role === 'USER' ? 'user' : m.role === 'ASSISTANT' ? 'assistant' : 'system',
    content: m.content,
  }));

  const userMsg: OpenAI.ChatCompletionMessageParam = {
    role: 'user',
    content: userMessage,
  };

  return [systemMessage, ...historyMessages, userMsg];
}

// ─────────────────────────────────────────────────────────────────
// Confidence scoring
// ─────────────────────────────────────────────────────────────────

async function scoreConfidence(
  userMessage: string,
  aiResponse: string,
  contextChunks: string[],
): Promise<ConfidenceScores> {
  try {
    const contextSample = contextChunks.slice(0, 3).join('\n').slice(0, 1500);

    const scoringPrompt = `You are a confidence evaluator for an AI customer support agent.

Rate the following AI response on three dimensions (each from 0.0 to 1.0):

1. **factual** (0.0–1.0): How factually accurate and grounded in the provided knowledge is the response?
2. **intent** (0.0–1.0): How well does the response address what the customer actually wants/needs?
3. **emotional** (0.0–1.0): How appropriate is the emotional tone? (1.0 = calm/helpful, 0.0 = hostile/frustrated customer)

Customer message: "${userMessage.slice(0, 500)}"
AI response: "${aiResponse.slice(0, 1000)}"
${contextSample ? `Knowledge used:\n${contextSample}` : ''}

Respond with ONLY valid JSON: {"factual": 0.0, "intent": 0.0, "emotional": 0.0}`;

    const result = await createCompletion(
      withTokenBudget(
        {
          model: env.OPENAI_MODEL,
          messages: [{ role: 'user', content: scoringPrompt }],
          temperature: 0,
          response_format: { type: 'json_object' },
        },
        60,
      ) as NonStreamingParams,
    );

    const raw = JSON.parse(result.choices[0]?.message?.content ?? '{}');
    const factual = clamp(Number(raw.factual ?? 0.5));
    const intent = clamp(Number(raw.intent ?? 0.5));
    const emotional = clamp(Number(raw.emotional ?? 0.5));
    const composite = 0.45 * factual + 0.35 * intent + 0.2 * emotional;

    return { factual, intent, emotional, composite: clamp(composite) };
  } catch (err) {
    logger.warn({ err }, 'Confidence scoring failed, using defaults');
    return { factual: 0.7, intent: 0.7, emotional: 0.7, composite: 0.7 };
  }
}

function clamp(n: number): number {
  return Math.min(1, Math.max(0, isNaN(n) ? 0.5 : n));
}

// ─────────────────────────────────────────────────────────────────
// Handoff decision
// ─────────────────────────────────────────────────────────────────

function decideHandoff(
  agent: any,
  confidence: ConfidenceScores,
  userMessage: string,
): boolean {
  if (!agent.handoffEnabled) return false;

  const isExplicit = HANDOFF_PATTERNS.some((p) => p.test(userMessage));
  if (isExplicit) return true;

  if (confidence.emotional < 0.25) return true;
  if (confidence.composite < (agent.handoffThreshold ?? 0.65)) return true;

  return false;
}

// ─────────────────────────────────────────────────────────────────
// Business hours check
// ─────────────────────────────────────────────────────────────────

function isWithinBusinessHours(businessHours: any): boolean {
  if (!businessHours || !businessHours.enabled) return true;

  try {
    const tz = businessHours.timezone ?? 'UTC';
    const schedule = businessHours.schedule; // e.g. { monday: { open: '09:00', close: '17:00', enabled: true }, ... }
    if (!schedule) return true;

    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const weekday = parts.find((p) => p.type === 'weekday')?.value?.toLowerCase();
    const hourStr = parts.find((p) => p.type === 'hour')?.value ?? '0';
    const minuteStr = parts.find((p) => p.type === 'minute')?.value ?? '0';
    const currentMins = parseInt(hourStr, 10) * 60 + parseInt(minuteStr, 10);

    const daySchedule = schedule[weekday as string];
    if (!daySchedule || !daySchedule.enabled) return false;

    const [openH, openM] = (daySchedule.open ?? '09:00').split(':').map(Number);
    const [closeH, closeM] = (daySchedule.close ?? '17:00').split(':').map(Number);
    const openMins = openH * 60 + openM;
    const closeMins = closeH * 60 + closeM;

    return currentMins >= openMins && currentMins < closeMins;
  } catch (err) {
    logger.warn({ err }, 'Business hours check failed, defaulting to open');
    return true;
  }
}

// ─────────────────────────────────────────────────────────────────
// Trim history to token budget
// ─────────────────────────────────────────────────────────────────

function trimHistory(messages: any[], maxTokens: number): any[] {
  // Take last 8 messages (4 turns), then trim by rough token count
  const recent = messages.slice(-8);
  let tokenCount = 0;
  const result: any[] = [];

  for (let i = recent.length - 1; i >= 0; i--) {
    const msgTokens = Math.ceil((recent[i].content?.length ?? 0) / 4);
    if (tokenCount + msgTokens > maxTokens) break;
    result.unshift(recent[i]);
    tokenCount += msgTokens;
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────
// Handoff trigger (inline, no circular deps)
// ─────────────────────────────────────────────────────────────────

async function _triggerHandoff(params: {
  agent: any;
  conversation: any;
  confidence: ConfidenceScores;
  userMessage: string;
  aiResponse: string;
}): Promise<void> {
  const { agent, conversation, confidence, userMessage, aiResponse } = params;

  // Determine trigger type
  let trigger: string;
  const isExplicit = HANDOFF_PATTERNS.some((p) => p.test(userMessage));
  if (isExplicit) {
    trigger = 'EXPLICIT_REQUEST';
  } else if (confidence.emotional < 0.25) {
    trigger = 'ANGER_DETECTED';
  } else {
    trigger = 'LOW_CONFIDENCE';
  }

  // Generate handoff summary via AI
  let summary = `Customer requested assistance. Last message: "${userMessage.slice(0, 300)}"`;
  try {
    const summaryResp = await createCompletion(
      withTokenBudget(
        {
          model: env.OPENAI_MODEL,
          messages: [
            {
              role: 'user',
              content: `Summarize this customer support conversation in 2-3 sentences for a live agent handoff. Focus on the customer's issue and what was attempted.\n\nCustomer: ${userMessage}\nAI Agent: ${aiResponse}`,
            },
          ],
          temperature: 0.3,
        },
        150,
      ) as NonStreamingParams,
    );
    summary = summaryResp.choices[0]?.message?.content ?? summary;
  } catch (err) {
    logger.warn({ err }, 'Handoff summary generation failed, using fallback');
  }

  // Create Handoff record
  const handoff = await prisma.handoff.create({
    data: {
      conversationId: conversation.id,
      trigger: trigger as any,
      confidence: confidence.composite,
      summary,
      destination: agent.handoffDest ?? 'NONE',
    },
  });

  // Update conversation status
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { status: 'HANDED_OFF' },
  });

  // Create SYSTEM message
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: 'SYSTEM',
      content: `Conversation handed off. Trigger: ${trigger}. Destination: ${agent.handoffDest ?? 'NONE'}.`,
    },
  });

  // Emit socket event
  socketService.emitToWorkspace(conversation.workspaceId, 'handoff:created', {
    handoffId: handoff.id,
    conversationId: conversation.id,
    trigger,
    destination: agent.handoffDest,
    summary,
  });

  socketService.emitToConversation(conversation.id, 'handoff:initiated', {
    trigger,
    destination: agent.handoffDest,
  });

  // Route to destination
  await routeToDestination({ agent, conversation, handoff, summary });
}

// ─────────────────────────────────────────────────────────────────
// Handoff destination routing
// ─────────────────────────────────────────────────────────────────

async function routeToDestination(params: {
  agent: any;
  conversation: any;
  handoff: any;
  summary: string;
}): Promise<void> {
  const { agent, conversation, handoff, summary } = params;
  const dest = agent.handoffDest as string;

  try {
    if (dest === 'ZENDESK') {
      await _routeToZendesk({ agent, conversation, handoff, summary });
    } else if (dest === 'FRESHDESK') {
      await _routeToFreshdesk({ agent, conversation, handoff, summary });
    } else if (dest === 'GORGIAS') {
      await _routeToGorgias({ agent, conversation, handoff, summary });
    } else {
      // NONE, LIVE_AGENT, EMAIL_QUEUE → send email notification
      await _sendHandoffEmail({ agent, conversation, handoff, summary });
    }
  } catch (err) {
    logger.error({ err, dest, handoffId: handoff.id }, 'Handoff destination routing failed');
    Sentry.captureException(err);
    // Fallback to email
    await _sendHandoffEmail({ agent, conversation, handoff, summary }).catch(() => {});
  }
}

async function _routeToZendesk(params: {
  agent: any;
  conversation: any;
  handoff: any;
  summary: string;
}): Promise<void> {
  const { agent, conversation, handoff, summary } = params;

  // Get channel credentials for Zendesk integration
  let creds: Record<string, string> = {};
  try {
    const { getDecryptedCredentials } = await import('../channel/channel.service');
    creds = await getDecryptedCredentials(conversation.workspaceId, 'ZENDESK' as any);
  } catch (err) {
    logger.warn({ err }, 'Could not load Zendesk credentials, skipping handoff');
    return;
  }

  const { subdomain, email, apiToken } = creds;
  if (!subdomain || !email || !apiToken) return;

  const authHeader = Buffer.from(`${email}/token:${apiToken}`).toString('base64');

  const resp = await fetch(`https://${subdomain}.zendesk.com/api/v2/tickets.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${authHeader}`,
    },
    body: JSON.stringify({
      ticket: {
        subject: `AI Handoff: ${conversation.customerName ?? conversation.customerId}`,
        comment: { body: summary },
        requester: { name: conversation.customerName ?? 'Customer', email: conversation.customerId },
        tags: ['axon-ai-handoff'],
        priority: 'normal',
      },
    }),
  });

  if (resp.ok) {
    const data = await resp.json() as any;
    const ticketId = String(data?.ticket?.id ?? '');
    await prisma.handoff.update({
      where: { id: handoff.id },
      data: { externalTicketId: ticketId },
    });
  } else {
    throw new Error(`Zendesk API error: ${resp.status} ${await resp.text()}`);
  }
}

async function _routeToFreshdesk(params: {
  agent: any;
  conversation: any;
  handoff: any;
  summary: string;
}): Promise<void> {
  const { agent, conversation, handoff, summary } = params;

  let creds: Record<string, string> = {};
  try {
    const { getDecryptedCredentials } = await import('../channel/channel.service');
    creds = await getDecryptedCredentials(conversation.workspaceId, 'FRESHDESK' as any);
  } catch (err) {
    logger.warn({ err }, 'Could not load Freshdesk credentials, skipping handoff');
    return;
  }

  const { subdomain, apiKey } = creds;
  if (!subdomain || !apiKey) return;

  const authHeader = Buffer.from(`${apiKey}:X`).toString('base64');

  const resp = await fetch(`https://${subdomain}.freshdesk.com/api/v2/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${authHeader}`,
    },
    body: JSON.stringify({
      subject: `AI Handoff: ${conversation.customerName ?? conversation.customerId}`,
      description: summary,
      email: conversation.customerId.includes('@') ? conversation.customerId : `${conversation.customerId}@unknown.com`,
      priority: 2,
      status: 2,
      tags: ['axon-ai-handoff'],
    }),
  });

  if (resp.ok) {
    const data = await resp.json() as any;
    const ticketId = String(data?.id ?? '');
    await prisma.handoff.update({
      where: { id: handoff.id },
      data: { externalTicketId: ticketId },
    });
  } else {
    throw new Error(`Freshdesk API error: ${resp.status}`);
  }
}

async function _routeToGorgias(params: {
  agent: any;
  conversation: any;
  handoff: any;
  summary: string;
}): Promise<void> {
  const { agent, conversation, handoff, summary } = params;

  let creds: Record<string, string> = {};
  try {
    const { getDecryptedCredentials } = await import('../channel/channel.service');
    creds = await getDecryptedCredentials(conversation.workspaceId, 'GORGIAS' as any);
  } catch (err) {
    logger.warn({ err }, 'Could not load Gorgias credentials, skipping handoff');
    return;
  }

  const { domain, email, apiKey } = creds;
  if (!domain || !email || !apiKey) return;

  const authHeader = Buffer.from(`${email}:${apiKey}`).toString('base64');

  const resp = await fetch(`https://${domain}.gorgias.com/api/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${authHeader}`,
    },
    body: JSON.stringify({
      subject: `AI Handoff: ${conversation.customerName ?? conversation.customerId}`,
      messages: [
        {
          channel: 'email',
          via: 'api',
          from_agent: false,
          body_text: summary,
          sender: { email: conversation.customerId.includes('@') ? conversation.customerId : `customer@unknown.com` },
        },
      ],
      tags: [{ name: 'axon-ai-handoff' }],
    }),
  });

  if (resp.ok) {
    const data = await resp.json() as any;
    const ticketId = String(data?.id ?? '');
    await prisma.handoff.update({
      where: { id: handoff.id },
      data: { externalTicketId: ticketId },
    });
  } else {
    throw new Error(`Gorgias API error: ${resp.status}`);
  }
}

async function _sendHandoffEmail(params: {
  agent: any;
  conversation: any;
  handoff: any;
  summary: string;
}): Promise<void> {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM) return;

  try {
    // Get workspace admin email
    const workspace = await prisma.workspace.findUnique({
      where: { id: params.conversation.workspaceId },
      include: {
        members: {
          where: { role: { in: ['OWNER', 'ADMIN'] } },
          include: { user: { select: { email: true, name: true } } },
          take: 1,
        },
      },
    });

    const adminEmail = workspace?.members[0]?.user?.email;
    if (!adminEmail) return;

    const resend = new Resend(env.RESEND_API_KEY);
    await resend.emails.send({
      from: env.RESEND_FROM!,
      to: adminEmail,
      subject: `[Handoff] Customer needs assistance - ${params.agent.name}`,
      html: `
        <h2>Customer Handoff Required</h2>
        <p><strong>Agent:</strong> ${params.agent.name}</p>
        <p><strong>Customer:</strong> ${params.conversation.customerName ?? params.conversation.customerId}</p>
        <p><strong>Channel:</strong> ${params.conversation.channelType}</p>
        <p><strong>Trigger:</strong> ${params.handoff.trigger}</p>
        <p><strong>Confidence:</strong> ${((params.handoff.confidence ?? 0) * 100).toFixed(1)}%</p>
        <hr />
        <h3>Conversation Summary</h3>
        <p>${params.summary}</p>
        <hr />
        <p><a href="${env.FRONTEND_URL}/conversations/${params.conversation.id}">View Conversation</a></p>
      `,
    });
  } catch (err) {
    logger.warn({ err }, 'Handoff email notification failed');
  }
}

// ─────────────────────────────────────────────────────────────────
// Auto-tagging helper
// ─────────────────────────────────────────────────────────────────

async function _autoTag(
  conversationId: string,
  userMessage: string,
  aiResponse: string,
  availableTags: string[],
  workspaceId: string,
): Promise<void> {
  const prompt = `Given the following customer conversation, select the most relevant tags from this list: ${availableTags.join(', ')}.

Customer: "${userMessage.slice(0, 400)}"
Agent: "${aiResponse.slice(0, 400)}"

Return a JSON array of tag names that apply (maximum 3), or an empty array if none apply. Example: ["billing", "refund"]`;

  const result = await createCompletion(
    withTokenBudget(
      {
        model: env.OPENAI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        response_format: { type: 'json_object' },
      },
      80,
    ) as NonStreamingParams,
  );

  try {
    const raw = JSON.parse(result.choices[0]?.message?.content ?? '{"tags":[]}');
    const tags: string[] = Array.isArray(raw) ? raw : (raw.tags ?? []);
    const validTags = tags.filter((t: string) => availableTags.includes(t)).slice(0, 3);

    if (validTags.length > 0) {
      const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
      const existing: string[] = conv?.tags ?? [];
      const merged = [...new Set([...existing, ...validTags])];

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { tags: merged },
      });

      try {
        const { deductCredits } = await import('../billing/credit.service');
        const { CreditReason: CR } = await import('@prisma/client');
        await deductCredits(workspaceId, 2, CR.TAGGING_CONSUMED, conversationId);
      } catch (creditErr) {
        logger.warn({ err: creditErr, workspaceId, conversationId }, 'Auto-tagging credit deduction failed');
      }
    }
  } catch (parseErr) {
    logger.warn({ err: parseErr, conversationId }, 'Auto-tagging response parse failed');
  }
}
