# AI Pipeline

This is the core of the product. Every inbound message from any channel flows through here.

## End-to-End Flow

```
Inbound message (any channel)
          │
          ▼
  ┌───────────────────────────────────┐
  │  1. Channel Adapter               │
  │     Normalise to InboundMessage   │
  └───────────────┬───────────────────┘
                  │
  ┌───────────────▼───────────────────┐
  │  2. Conversation Resolver         │
  │     Find or create Conversation   │
  │     Persist USER message          │
  └───────────────┬───────────────────┘
                  │
  ┌───────────────▼───────────────────┐
  │  3. Credits Pre-check             │
  │     Balance ≥ cost?               │
  │     No → fallback message         │
  └───────────────┬───────────────────┘
                  │
  ┌───────────────▼───────────────────┐
  │  4. RAG Retrieval                 │
  │     Embed query (text-emb-3-small)│
  │     pgvector cosine search        │
  │     Top-5 chunks (threshold 0.78) │
  └───────────────┬───────────────────┘
                  │
  ┌───────────────▼───────────────────┐
  │  5. Prompt Assembly               │
  │     System prompt                 │
  │     + Routing policy (if set)     │
  │     + Business hours note         │
  │     + Retrieved knowledge chunks  │
  │     + Conversation history (last 8│
  │       turns, trimmed to 4K tokens)│
  │     + Current user message        │
  └───────────────┬───────────────────┘
                  │
  ┌───────────────▼───────────────────┐
  │  6. GPT-4o Completion             │
  │     stream: true (SSE to browser) │
  │     or collect full (channels)    │
  │     Record latencyMs, tokens      │
  └───────────────┬───────────────────┘
                  │
  ┌───────────────▼───────────────────┐
  │  7. Confidence Scoring            │
  │     Composite = 0.45×factual      │
  │               + 0.35×intent       │
  │               + 0.20×emotional    │
  └───────────────┬───────────────────┘
                  │
          ┌───────┴───────┐
          │               │
      score ≥ threshold  score < threshold
          │               │
          ▼               ▼
   Send response    Handoff Service
   Persist message  (see 09-handoff.md)
   Deduct credits
   Emit socket event
```

---

## 1. Inbound Message Normalisation

Every channel adapter converts its platform-specific payload into a common `InboundMessage` type:

```ts
interface InboundMessage {
  workspaceId: string;
  agentId: string;
  channelType: ChannelType;
  externalId: string;       // platform conversation/thread ID
  customerId: string;       // phone number, user ID, email
  customerName?: string;
  content: string;          // plain text (voice transcription, text)
  attachments?: Attachment[];
  metadata?: Record<string, unknown>;
}
```

---

## 2. Conversation Resolver

```ts
async function resolveConversation(msg: InboundMessage): Promise<Conversation> {
  // Look for an open conversation for this customer on this channel
  let conversation = await prisma.conversation.findFirst({
    where: {
      workspaceId: msg.workspaceId,
      agentId: msg.agentId,
      channelType: msg.channelType,
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
        channelType: msg.channelType,
        externalId: msg.externalId,
        customerId: msg.customerId,
        customerName: msg.customerName,
        status: 'OPEN',
      },
    });
  }

  // Persist the user message
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: 'USER',
      content: msg.content,
    },
  });

  return conversation;
}
```

---

## 3. Credits Pre-Check

```ts
async function checkAndReserveCredits(workspaceId: string, cost: number): Promise<void> {
  const balance = await CreditService.getBalance(workspaceId);
  if (balance < cost) {
    throw new AppError('INSUFFICIENT_CREDITS', 402, 'Not enough credits');
  }
  // Optimistic reservation — actual deduction after response
}
```

Credit costs:
- Text message: **1 credit**
- Voice message (per minute): **5 credits**
- Auto-tagging (per conversation): **2 credits**

---

## 4. RAG Retrieval

```ts
async function retrieveContext(agentId: string, query: string): Promise<string[]> {
  // 1. Embed the query
  const queryVec = await EmbedService.embed(query);

  // 2. Vector similarity search against this agent's knowledge chunks
  const chunks = await prisma.$queryRaw<{ content: string; similarity: number }[]>`
    SELECT content, 1 - (embedding <=> ${queryVec}::vector) AS similarity
    FROM knowledge_chunks kc
    JOIN knowledge_docs kd ON kd.id = kc.doc_id
    WHERE kd.agent_id = ${agentId}
      AND kd.is_active = true
      AND kd.status = 'READY'
      AND 1 - (embedding <=> ${queryVec}::vector) > 0.78
    ORDER BY similarity DESC
    LIMIT 5
  `;

  return chunks.map(c => c.content);
}
```

### Embedding Cache

Embeddings are expensive. Cache them in Redis with TTL = 1 hour:

```ts
async function embed(text: string): Promise<number[]> {
  const key = `embed:${sha256(text)}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  const vec = response.data[0].embedding;
  await redis.setex(key, 3600, JSON.stringify(vec));
  return vec;
}
```

---

## 5. Prompt Assembly

```ts
function buildPrompt(params: {
  agent: Agent;
  contextChunks: string[];
  history: Message[];
  userMessage: string;
}): OpenAI.ChatCompletionMessageParam[] {
  const { agent, contextChunks, history, userMessage } = params;

  const systemParts: string[] = [agent.systemPrompt];

  if (agent.routingPolicy) {
    systemParts.push(`\n\n[Human Routing Policy]\n${agent.routingPolicy}`);
  }

  if (!isWithinBusinessHours(agent.businessHours)) {
    systemParts.push(
      `\n\n[Note] It is currently outside business hours. Let the user know and offer to take a message.`
    );
  }

  if (contextChunks.length > 0) {
    systemParts.push(
      `\n\n[Relevant Knowledge]\n${contextChunks.map((c, i) => `${i + 1}. ${c}`).join('\n\n')}`
    );
  }

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemParts.join('') },
    // Last 8 turns from history, trimmed to ~4K tokens
    ...trimHistory(history, 4000).map(m => ({
      role: m.role === 'USER' ? 'user' : 'assistant' as const,
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ];

  return messages;
}
```

### Token Budget

| Component | Max tokens |
|---|---|
| System prompt | 2000 |
| Knowledge context | 1500 |
| History | 4000 |
| User message | 500 |
| Completion | 1024 |
| **Total** | **~9024** |

GPT-4o context window is 128K, so this is conservative — good for cost control.

---

## 6. GPT-4o Completion

### Streaming (web widget)

```ts
async function completionStream(
  messages: OpenAI.ChatCompletionMessageParam[],
  onDelta: (text: string) => void
): Promise<{ full: string; tokens: number }> {
  const start = Date.now();
  const stream = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    messages,
    stream: true,
    max_tokens: 1024,
    temperature: 0.3,
  });

  let full = '';
  let tokens = 0;
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    full += delta;
    onDelta(delta);
    if (chunk.usage) tokens = chunk.usage.total_tokens;
  }

  return { full, tokens };
}
```

### Non-Streaming (channel webhooks)

```ts
async function completionFull(
  messages: OpenAI.ChatCompletionMessageParam[]
): Promise<{ text: string; tokens: number }> {
  const res = await openai.chat.completions.create({
    model: env.OPENAI_MODEL,
    messages,
    max_tokens: 1024,
    temperature: 0.3,
  });

  return {
    text: res.choices[0].message.content ?? '',
    tokens: res.usage?.total_tokens ?? 0,
  };
}
```

---

## 7. Confidence Scoring

After completion, a second fast call evaluates the response quality:

```ts
interface ConfidenceComponents {
  factual: number;   // 0-1: Does the response reference verified knowledge?
  intent:  number;   // 0-1: Does it address what the user actually asked?
  emotional: number; // 0-1: Is the customer calm/neutral?
}

async function scoreConfidence(
  userMessage: string,
  aiResponse: string,
  contextChunks: string[]
): Promise<ConfidenceComponents & { composite: number }> {
  const prompt = `Rate the following AI response on three dimensions (0.0–1.0 each).
Return ONLY valid JSON: {"factual":0.0,"intent":0.0,"emotional":0.0}

User message: "${userMessage}"
AI response: "${aiResponse}"
Knowledge used: ${contextChunks.length > 0 ? contextChunks.join('\n') : 'None'}

factual  = how well grounded in the knowledge (1.0 = fully supported, 0.0 = hallucination)
intent   = how well it addresses the user's actual goal (1.0 = direct answer, 0.0 = off-topic)
emotional = user sentiment inferred from their message (1.0 = calm, 0.0 = angry/distressed)`;

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',   // cheap model for scoring
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 60,
    temperature: 0,
    response_format: { type: 'json_object' },
  });

  const { factual, intent, emotional } = JSON.parse(res.choices[0].message.content!);
  const composite = 0.45 * factual + 0.35 * intent + 0.20 * emotional;

  return { factual, intent, emotional, composite };
}
```

The composite score is stored on the `Message` record and used to decide handoff.

---

## Streaming to the Browser

When `stream: true`, the `/v1/agents/:id/chat` route sets headers and flushes SSE:

```ts
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');

await pipeline.run({
  ...,
  onDelta: (text) => {
    res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);
  },
});

res.write('data: [DONE]\n\n');
res.end();
```

Socket.io is used for real-time updates **in the dashboard** (human agent monitoring). The browser widget uses direct HTTP/SSE.

---

## Error Handling in Pipeline

```ts
try {
  await pipeline.run(msg);
} catch (err) {
  if (err instanceof AppError && err.code === 'INSUFFICIENT_CREDITS') {
    await sender.send(msg.channelType, msg.customerId, {
      content: "I'm sorry, I'm unable to respond right now. Please try again later."
    });
    return;
  }
  // OpenAI timeout / network error — send fallback
  logger.error({ err, workspaceId: msg.workspaceId }, 'AI pipeline error');
  await sender.send(msg.channelType, msg.customerId, {
    content: "I'm having trouble right now. Please try again in a moment."
  });
}
```

---

## Latency Budget

| Step | Target P50 | Target P95 |
|---|---|---|
| Embed query | 80ms | 200ms |
| pgvector search | 15ms | 50ms |
| GPT-4o TTFB | 400ms | 1200ms |
| GPT-4o full | 800ms | 2500ms |
| Confidence score | 150ms | 400ms |
| DB writes | 20ms | 60ms |
| **Total (streaming TTFB)** | **~500ms** | **~1.5s** |

The streaming TTFB (time to first byte of response) is what matters most for perceived speed.
