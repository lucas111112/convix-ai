# Channels & Webhook Gateway

Every channel is an inbound/outbound adapter. Inbound messages arrive as webhooks; outbound replies go via each platform's API.

## Architecture

```
                    ┌─────────────────────────────────┐
                    │  Webhook Router                  │
                    │  POST /v1/webhooks/:slug/:type   │
                    └──────────────┬──────────────────┘
                                   │
                    ┌──────────────▼──────────────────┐
                    │  Signature Verifier              │
                    │  (HMAC / token per platform)     │
                    └──────────────┬──────────────────┘
                                   │
                    ┌──────────────▼──────────────────┐
                    │  Channel Adapter                 │
                    │  parse → InboundMessage          │
                    └──────────────┬──────────────────┘
                                   │
                    ┌──────────────▼──────────────────┐
                    │  Dispatcher                      │
                    │  look up workspace + agent       │
                    │  → AI Pipeline                   │
                    └──────────────┬──────────────────┘
                                   │
                    ┌──────────────▼──────────────────┐
                    │  Sender                          │
                    │  format + send reply via adapter │
                    └─────────────────────────────────┘
```

---

## Credential Storage

Channel credentials (API keys, tokens, phone IDs) are stored as AES-256-GCM encrypted JSON in the `credentials` column of the `channels` table.

```ts
// src/lib/crypto.ts
const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(env.CHANNEL_ENCRYPTION_KEY, 'hex'); // 32-byte key

export function encryptCredentials(obj: Record<string, string>): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const plain = JSON.stringify(obj);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Store as: iv:tag:ciphertext (all hex)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptCredentials(stored: string): Record<string, string> {
  const [ivHex, tagHex, cipherHex] = stored.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(cipherHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(tag);
  const plain = decipher.update(encrypted) + decipher.final('utf8');
  return JSON.parse(plain);
}
```

---

## Channel: Web Widget

No webhook — uses the `/v1/agents/:id/chat` REST endpoint directly. The widget embeds a JavaScript snippet that POSTs to this endpoint.

**Outbound**: Responses stream back via SSE or are returned synchronously.

**Socket.io**: The dashboard uses Socket.io to monitor live conversations in real time (see `12-realtime.md`).

---

## Channel: WhatsApp (Meta Cloud API)

### Webhook Setup

Meta sends a GET request to verify the webhook:

```ts
// GET /v1/webhooks/:slug/whatsapp
router.get('/:slug/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const creds = getChannelCreds(req.params.slug, 'WHATSAPP');
  if (mode === 'subscribe' && token === creds.webhookVerifyToken) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});
```

### Inbound Message

```ts
// POST /v1/webhooks/:slug/whatsapp
router.post('/:slug/whatsapp', verifyWhatsAppSignature, async (req, res) => {
  // Acknowledge immediately (Meta expects 200 within 5s)
  res.sendStatus(200);

  const entry = req.body?.entry?.[0];
  const changes = entry?.changes?.[0];
  const message = changes?.value?.messages?.[0];
  if (!message) return;

  const inbound: InboundMessage = {
    workspaceId: req.workspace.id,
    agentId: req.agent.id,
    channelType: 'WHATSAPP',
    externalId: message.id,
    customerId: message.from,          // WhatsApp phone number
    content: message.text?.body ?? '',
  };

  await dispatcher.handle(inbound);
});
```

### Signature Verification

```ts
function verifyWhatsAppSignature(req, res, next) {
  const sig = req.headers['x-hub-signature-256'];
  const expected = 'sha256=' + crypto
    .createHmac('sha256', env.WHATSAPP_APP_SECRET)
    .update(req.rawBody)   // need raw body — use express.raw()
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    throw new AppError('INVALID_SIGNATURE', 401);
  }
  next();
}
```

### Outbound Reply

```ts
async function sendWhatsApp(customerId: string, content: string, creds: WhatsAppCreds) {
  await fetch(
    `https://graph.facebook.com/v18.0/${creds.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: customerId,
        type: 'text',
        text: { body: content },
      }),
    }
  );
}
```

---

## Channel: Telegram

### Webhook Registration

On channel activation, we register our webhook URL with Telegram:

```ts
async function registerTelegramWebhook(botToken: string, workspaceSlug: string) {
  const url = `${env.API_BASE_URL}/v1/webhooks/${workspaceSlug}/telegram`;
  await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: 'POST',
    body: JSON.stringify({ url }),
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### Inbound

```ts
router.post('/:slug/telegram', async (req, res) => {
  res.sendStatus(200);
  const msg = req.body?.message;
  if (!msg?.text) return;

  const inbound: InboundMessage = {
    channelType: 'TELEGRAM',
    externalId: String(msg.message_id),
    customerId: String(msg.chat.id),
    customerName: msg.from?.first_name,
    content: msg.text,
  };

  await dispatcher.handle({ ...inbound, ...resolveWorkspaceAgent(req) });
});
```

### Outbound

```ts
async function sendTelegram(chatId: string, content: string, creds: TelegramCreds) {
  await fetch(`https://api.telegram.org/bot${creds.botToken}/sendMessage`, {
    method: 'POST',
    body: JSON.stringify({ chat_id: chatId, text: content }),
    headers: { 'Content-Type': 'application/json' },
  });
}
```

---

## Channel: SMS (Twilio)

### Inbound

Twilio sends a POST with `application/x-www-form-urlencoded`:

```ts
router.post('/:slug/sms', validateTwilioSignature, async (req, res) => {
  const { From, Body } = req.body;

  const inbound: InboundMessage = {
    channelType: 'SMS',
    customerId: From,
    content: Body,
    externalId: req.body.MessageSid,
  };

  const reply = await dispatcher.handle({ ...inbound, ...resolveWorkspaceAgent(req) });

  // Respond with TwiML
  res.type('text/xml').send(
    `<Response><Message>${escapeXml(reply.content)}</Message></Response>`
  );
});
```

### Outbound (async — for handoff notifications, etc.)

```ts
async function sendSms(to: string, content: string, creds: TwilioCreds) {
  const client = twilio(creds.accountSid, creds.authToken);
  await client.messages.create({
    body: content,
    from: creds.phoneNumber,
    to,
  });
}
```

---

## Channel: Voice (Twilio)

Voice is the most complex channel. Calls are stateful — the AI responds in real time using Twilio's `<Gather>` verb to capture speech, then processes it through the pipeline.

### Inbound Call Flow

```
1. Inbound call arrives → Twilio POSTs to /v1/webhooks/:slug/voice
2. Backend responds with TwiML:
   <Response>
     <Say voice="Polly.Joanna">Hi! I'm your AI assistant. How can I help?</Say>
     <Gather input="speech" speechTimeout="3" action="/v1/webhooks/:slug/voice/turn">
     </Gather>
   </Response>

3. Customer speaks → Twilio captures speech → POSTs transcript to /voice/turn
4. Backend runs AI pipeline on transcript
5. Backend responds with TwiML:
   <Response>
     <Say>Here is what I found: ...</Say>
     <Gather input="speech" speechTimeout="3" action="/v1/webhooks/:slug/voice/turn">
     </Gather>
   </Response>

6. Loop continues until customer hangs up or handoff is triggered
```

### Voice Turn Handler

```ts
router.post('/:slug/voice/turn', validateTwilioSignature, async (req, res) => {
  const { SpeechResult, CallSid, From } = req.body;
  if (!SpeechResult) {
    return res.type('text/xml').send(
      '<Response><Say>Sorry, I didn\'t catch that. Could you repeat?</Say><Gather input="speech" action="./turn"/></Response>'
    );
  }

  const inbound: InboundMessage = {
    channelType: 'VOICE',
    customerId: From,
    externalId: CallSid,
    content: SpeechResult,
    metadata: { callSid: CallSid },
  };

  const result = await dispatcher.handle({ ...inbound, ...resolveWorkspaceAgent(req) });

  // Use TTS via OpenAI or Twilio Polly
  const twiml = `
    <Response>
      <Say voice="${agent.ttsVoice ?? 'Polly.Joanna'}">${escapeXml(result.content)}</Say>
      <Gather input="speech" speechTimeout="3" action="./turn" />
    </Response>
  `;
  res.type('text/xml').send(twiml);
});
```

---

## Channel: Slack

### Events API Setup

Slack requires challenge verification on first setup:

```ts
router.post('/:slug/slack', async (req, res) => {
  if (req.body.type === 'url_verification') {
    return res.json({ challenge: req.body.challenge });
  }
  res.sendStatus(200);  // Acknowledge immediately

  const event = req.body.event;
  if (event?.type !== 'message' || event.bot_id) return;  // ignore bot messages

  const inbound: InboundMessage = {
    channelType: 'SLACK',
    customerId: event.user,
    externalId: event.ts,
    content: event.text,
    metadata: { channel: event.channel, threadTs: event.thread_ts },
  };

  const result = await dispatcher.handle({ ...inbound, ...resolveWorkspaceAgent(req) });

  // Reply in thread
  const creds = getChannelCreds(req.params.slug, 'SLACK');
  await sendSlack(event.channel, result.content, event.ts, creds);
});
```

### Outbound (threaded reply)

```ts
async function sendSlack(channel: string, text: string, threadTs: string, creds: SlackCreds) {
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channel, text, thread_ts: threadTs }),
  });
}
```

---

## Channel: Email (SendGrid Inbound Parse)

### Setup

Configure SendGrid Inbound Parse to POST to `/v1/webhooks/:slug/email` for a specific inbound domain (e.g., `ai@support.yourdomain.com`).

### Inbound

```ts
router.post('/:slug/email', express.urlencoded({ extended: true }), async (req, res) => {
  res.sendStatus(200);

  const { from, subject, text, html } = req.body;
  const emailAddress = parseEmailAddress(from);  // extract address from "Name <addr>"
  const content = text || stripHtml(html);       // prefer plain text

  const inbound: InboundMessage = {
    channelType: 'EMAIL',
    customerId: emailAddress,
    content: `Subject: ${subject}\n\n${content}`,
    externalId: req.body['message-id'] ?? Date.now().toString(),
    metadata: { subject, from },
  };

  await dispatcher.handle({ ...inbound, ...resolveWorkspaceAgent(req) });
});
```

### Outbound

```ts
async function sendEmail(to: string, content: string, creds: EmailCreds, metadata?: { subject?: string }) {
  await resend.emails.send({
    from: creds.fromAddress,
    to,
    subject: `Re: ${metadata?.subject ?? 'Your Enquiry'}`,
    text: content,
  });
}
```

---

## Dispatcher

The dispatcher is the central coordinator:

```ts
async function handle(inbound: InboundMessage): Promise<{ content: string }> {
  // 1. Verify agent is active and channel is enabled
  const agent = await validateAgent(inbound.workspaceId, inbound.agentId, inbound.channelType);

  // 2. Check business hours
  if (!isWithinBusinessHours(agent.businessHours)) {
    const reply = "I'm currently outside business hours. Leave a message and I'll get back to you.";
    await sender.send(inbound.channelType, inbound.customerId, { content: reply }, agent);
    return { content: reply };
  }

  // 3. Run AI pipeline
  const result = await pipeline.run(inbound);

  // 4. Send reply outbound
  await sender.send(inbound.channelType, inbound.customerId, result, agent);

  // 5. Emit socket event to dashboard
  await socketService.emitToWorkspace(inbound.workspaceId, 'new_message', {
    conversationId: result.conversationId,
    message: result.message,
  });

  return result;
}
```
