# API Reference

Base URL: `http://localhost:3001/v1` (dev) · `https://api.axon.ai/v1` (prod)

All endpoints return `Content-Type: application/json`.

Protected endpoints require `Authorization: Bearer <accessToken>`.

---

## Auth

### `POST /v1/auth/register`
Create a new user account and workspace.

**Body**
```json
{ "name": "Jane", "email": "jane@example.com", "password": "secret123" }
```
**Response 201**
```json
{
  "user":        { "id": "...", "email": "...", "name": "..." },
  "workspace":   { "id": "...", "name": "Jane's Workspace", "slug": "abc123" },
  "accessToken": "eyJ..."
}
```
Sets `refresh_token` httpOnly cookie.

---

### `POST /v1/auth/login`
**Body** `{ "email": "...", "password": "..." }`

**Response 200** Same shape as register. Sets `refresh_token` cookie.

---

### `POST /v1/auth/refresh`
Reads `refresh_token` cookie. No body needed.

**Response 200** `{ "accessToken": "eyJ..." }`

---

### `POST /v1/auth/logout`
Revokes refresh token cookie.

**Response 204** (no body)

---

## Workspace

### `GET /v1/workspace` 🔒
Get current workspace info.

**Response 200**
```json
{
  "id": "...",
  "name": "Acme AI",
  "slug": "acme-xyz",
  "plan": "BUILDER",
  "creditBalance": 8432,
  "memberCount": 3
}
```

### `PATCH /v1/workspace` 🔒 ADMIN
Update workspace name.

**Body** `{ "name": "New Name" }`

---

## Agents

### `GET /v1/agents` 🔒
List all agents in the workspace.

**Response 200**
```json
{
  "agents": [
    {
      "id": "...",
      "name": "Support Agent",
      "avatar": "🤖",
      "status": "ACTIVE",
      "mode": "TEXT",
      "channelCount": 2,
      "knowledgeCount": 5,
      "createdAt": "2026-01-10T..."
    }
  ]
}
```

---

### `POST /v1/agents` 🔒 ADMIN
Create a new agent.

**Body**
```json
{
  "name": "Support Agent",
  "avatar": "🤖",
  "systemPrompt": "You are a helpful support agent...",
  "mode": "TEXT",
  "voiceEnabled": false,
  "handoffEnabled": true,
  "handoffThreshold": 0.65,
  "handoffDest": "ZENDESK",
  "routingPolicy": "Route to human when the customer mentions a refund over $100"
}
```
**Response 201** Full agent object.

---

### `GET /v1/agents/:id` 🔒
Get a single agent with full details.

**Response 200**
```json
{
  "id": "...",
  "name": "...",
  "systemPrompt": "...",
  "status": "ACTIVE",
  "mode": "TEXT",
  "handoffEnabled": true,
  "handoffThreshold": 0.65,
  "handoffDest": "ZENDESK",
  "channels": [ { "type": "WEB", "isActive": true }, ... ],
  "knowledgeDocs": [ { "id": "...", "title": "FAQ", "status": "READY", "type": "TEXT" }, ... ],
  "widgetConfig": { ... },
  "createdAt": "..."
}
```

---

### `PATCH /v1/agents/:id` 🔒 ADMIN
Partial update of any agent fields.

**Body** Any subset of the create body.

---

### `DELETE /v1/agents/:id` 🔒 ADMIN
Hard delete agent and all related data (channels, knowledge, conversations).

**Response 204**

---

### `POST /v1/agents/:id/chat` 🔒
Send a message to the agent and receive a response.

**Body**
```json
{
  "messages": [
    { "role": "user", "content": "What is your return policy?" }
  ],
  "conversationId": "existing-or-omit-to-create-new",
  "stream": false
}
```

**Response 200 (non-streaming)**
```json
{
  "conversationId": "...",
  "message": {
    "id": "...",
    "role": "assistant",
    "content": "Our return policy is...",
    "confidence": 0.82,
    "latencyMs": 1243
  }
}
```

**Response 200 (streaming)** — `Content-Type: text/event-stream`
```
data: {"choices":[{"delta":{"content":"Our "}}]}
data: {"choices":[{"delta":{"content":"return "}}]}
...
data: [DONE]
```

---

### `POST /v1/agents/:id/voice` 🔒
Initiate an outbound voice call via Twilio.

**Body** `{ "to": "+15551234567", "conversationId": "..." }`

---

## Knowledge

### `GET /v1/agents/:agentId/knowledge` 🔒
List knowledge docs for an agent.

**Response 200**
```json
{
  "docs": [
    { "id": "...", "title": "Product FAQ", "type": "TEXT", "status": "READY", "chunkCount": 14, "isActive": true }
  ]
}
```

---

### `POST /v1/agents/:agentId/knowledge` 🔒 ADMIN
Add a knowledge source. Triggers async ingestion.

**Body (text)**
```json
{ "type": "TEXT", "title": "Return Policy", "content": "We accept returns within 30 days..." }
```

**Body (url)**
```json
{ "type": "URL", "title": "Help Center", "sourceUrl": "https://help.example.com" }
```

**Body (pdf)**
```json
{ "type": "PDF", "title": "User Guide", "storageKey": "uploads/abc123.pdf" }
```

**Body (qa)**
```json
{
  "type": "QA",
  "title": "Common Q&As",
  "content": "Q: What are your hours?\nA: We're open 9-5 EST."
}
```

**Body (youtube)**
```json
{ "type": "YOUTUBE", "title": "Product Demo", "sourceUrl": "https://youtu.be/xyz" }
```

**Body (sitemap)**
```json
{ "type": "SITEMAP", "title": "Docs Site", "sourceUrl": "https://docs.example.com/sitemap.xml" }
```

**Response 202** `{ "doc": { "id": "...", "status": "PENDING" } }`

---

### `PATCH /v1/agents/:agentId/knowledge/:id` 🔒 ADMIN
Toggle `isActive` or rename.

**Body** `{ "isActive": false }` or `{ "title": "New Title" }`

---

### `DELETE /v1/agents/:agentId/knowledge/:id` 🔒 ADMIN
Delete doc and all its chunks.

---

### `POST /v1/agents/:agentId/knowledge/:id/reindex` 🔒 ADMIN
Force re-ingestion of a source.

---

## Channels

### `GET /v1/channels` 🔒
List all channels in workspace.

```json
{
  "channels": [
    { "id": "...", "type": "WHATSAPP", "isActive": true },
    { "id": "...", "type": "WEB", "isActive": true }
  ]
}
```

---

### `PUT /v1/channels/:type` 🔒 ADMIN
Create or update channel credentials. Credentials are encrypted at rest.

**Body (WhatsApp example)**
```json
{
  "isActive": true,
  "credentials": {
    "phoneNumberId": "1234567890",
    "accessToken": "EAAxxxxxx",
    "webhookVerifyToken": "my-secret-token"
  }
}
```

**Body (Twilio SMS/Voice)**
```json
{
  "isActive": true,
  "credentials": {
    "accountSid": "ACxxx",
    "authToken": "xxx",
    "phoneNumber": "+15551234567"
  }
}
```

---

### `POST /v1/channels/:type/test` 🔒 ADMIN
Send a test message on a channel.

---

### `PUT /v1/agents/:agentId/channels/:channelId` 🔒 ADMIN
Enable/disable a channel on a specific agent.

**Body** `{ "isActive": true }`

---

## Widget

### `GET /v1/agents/:agentId/widget` 🔒
Get widget config.

### `PATCH /v1/agents/:agentId/widget` 🔒 ADMIN
Update widget config. Body matches `WidgetConfig` fields.

---

## Conversations

### `GET /v1/conversations` 🔒
List conversations with pagination.

**Query params**: `agentId`, `status`, `channelType`, `from`, `to`, `limit` (default 50), `cursor`

**Response 200**
```json
{
  "conversations": [ { "id": "...", "status": "OPEN", "channelType": "WEB", ... } ],
  "nextCursor": "..."
}
```

---

### `GET /v1/conversations/:id` 🔒
Get conversation with full message history.

```json
{
  "conversation": { "id": "...", "status": "...", "customerId": "...", ... },
  "messages": [
    { "id": "...", "role": "USER", "content": "Hi", "createdAt": "..." },
    { "id": "...", "role": "ASSISTANT", "content": "Hello!", "confidence": 0.9, "latencyMs": 800, "createdAt": "..." }
  ]
}
```

---

### `PATCH /v1/conversations/:id` 🔒
Update status (`RESOLVED`, `OPEN`), tags, metadata.

---

## Handoff

### `POST /v1/conversations/:id/handoff` 🔒
Manually trigger handoff for a conversation.

**Body** `{ "trigger": "EXPLICIT_REQUEST", "destination": "ZENDESK" }`

---

### `GET /v1/conversations/:id/handoffs` 🔒
List handoff events for a conversation.

---

### `PATCH /v1/handoffs/:id` 🔒
Resolve a handoff. Set `resolvedAt`, optionally add `learningNote`.

**Body** `{ "learningNote": "Agent should have offered a refund proactively." }`

---

## Analytics

### `GET /v1/analytics` 🔒
**Query params**: `from` (ISO date), `to` (ISO date), `agentId` (optional), `interval` (`day`|`week`|`month`)

**Response 200**
```json
{
  "summary": {
    "totalMessages": 4821,
    "totalConversations": 1203,
    "handoffs": 87,
    "resolutionRate": 0.928,
    "avgLatencyMs": 1140,
    "p95LatencyMs": 3200,
    "creditsConsumed": 5200
  },
  "series": [
    { "date": "2026-02-01", "messages": 320, "handoffs": 12, "avgLatencyMs": 1050 },
    ...
  ]
}
```

---

### `GET /v1/analytics/credits` 🔒
Get credit balance and usage breakdown.

```json
{
  "balance": 8432,
  "plan": "BUILDER",
  "monthlyGrant": 10000,
  "consumed": {
    "messages": 1420,
    "voice": 60,
    "tagging": 68,
    "total": 1548
  }
}
```

---

### `GET /v1/analytics/agents/:agentId` 🔒
Per-agent analytics summary.

---

## Billing

### `GET /v1/billing/plans` 🔒
Return plan catalogue.

### `GET /v1/billing/invoices` 🔒
Return invoice history (from Stripe).

### `POST /v1/billing/portal` 🔒 OWNER
Create a Stripe Customer Portal session URL.

**Response 200** `{ "url": "https://billing.stripe.com/session/..." }`

---

## Webhooks (No Auth — Verified by HMAC/Token)

These are inbound webhooks from external platforms. They have their own signature verification per platform.

### `GET  /v1/webhooks/:slug/whatsapp` — WhatsApp hub verification
### `POST /v1/webhooks/:slug/whatsapp` — Inbound WhatsApp messages
### `POST /v1/webhooks/:slug/telegram` — Inbound Telegram updates
### `POST /v1/webhooks/:slug/messenger` — Inbound Messenger events
### `POST /v1/webhooks/:slug/slack` — Inbound Slack events
### `POST /v1/webhooks/:slug/sms` — Inbound Twilio SMS
### `POST /v1/webhooks/:slug/voice` — Twilio Voice (TwiML endpoint)
### `POST /v1/webhooks/:slug/email` — Inbound SendGrid parse
### `POST /v1/webhooks/stripe` — Stripe billing events

The `:slug` is the workspace slug, used to route to the correct workspace without exposing workspace IDs.

---

## Error Response Shape

All errors follow this shape:

```json
{
  "error": "AGENT_NOT_FOUND",
  "message": "Agent not found or does not belong to this workspace",
  "statusCode": 404
}
```

| Error Code | Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Zod schema failed |
| `MISSING_TOKEN` | 401 | No Authorization header |
| `INVALID_TOKEN` | 401 | Token expired or tampered |
| `FORBIDDEN` | 403 | Insufficient role |
| `NOT_FOUND` | 404 | Resource missing |
| `CONFLICT` | 409 | Duplicate (e.g., email taken) |
| `INSUFFICIENT_CREDITS` | 402 | Not enough credits |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Pagination

Cursor-based pagination is used on list endpoints.

```
GET /v1/conversations?limit=50&cursor=clxyz123
```

Response includes `nextCursor` (null if no more pages):

```json
{ "conversations": [...], "nextCursor": "clxyz456" }
```

The cursor is the `id` of the last item in the current page, base64-encoded.
