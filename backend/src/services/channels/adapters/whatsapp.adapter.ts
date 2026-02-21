import crypto from 'crypto';
import { logger } from '../../../lib/logger';
import { AppError } from '../../../lib/errors';

const META_GRAPH_API = 'https://graph.facebook.com/v18.0';

// ─────────────────────────────────────────────────────────────────
// Send
// ─────────────────────────────────────────────────────────────────

export async function send(
  customerId: string,
  content: string,
  creds: Record<string, string>,
): Promise<void> {
  const { phoneNumberId, accessToken } = creds;

  if (!phoneNumberId || !accessToken) {
    throw new AppError('MISSING_CREDENTIALS', 422, 'WhatsApp credentials missing: phoneNumberId or accessToken');
  }

  const url = `${META_GRAPH_API}/${phoneNumberId}/messages`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: customerId,
      type: 'text',
      text: { body: content },
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    logger.error({ status: resp.status, body, customerId }, 'WhatsApp send failed');
    throw new AppError('WHATSAPP_SEND_FAILED', 502, `WhatsApp API error: ${resp.status}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// Signature verification
// ─────────────────────────────────────────────────────────────────

export function verifySignature(rawBody: Buffer, signature: string, appSecret: string): void {
  const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');

  // Constant-time comparison
  const sigBuffer = Buffer.from(signature);
  const expBuffer = Buffer.from(expected);

  if (
    sigBuffer.length !== expBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expBuffer)
  ) {
    throw new AppError('INVALID_SIGNATURE', 401, 'WhatsApp webhook signature verification failed');
  }
}

// ─────────────────────────────────────────────────────────────────
// Parse inbound
// ─────────────────────────────────────────────────────────────────

export function parseInbound(
  body: any,
): { externalId: string; customerId: string; content: string } | null {
  try {
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const messages = value?.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return null;
    }

    const message = messages[0];

    // Only handle text messages (filter out status updates, etc.)
    if (message.type !== 'text') {
      logger.debug({ type: message.type }, 'WhatsApp: non-text message, skipping');
      return null;
    }

    const content = message.text?.body;
    if (!content) return null;

    return {
      externalId: message.id,
      customerId: message.from, // WhatsApp phone number
      content,
    };
  } catch (err) {
    logger.warn({ err }, 'WhatsApp parseInbound failed');
    return null;
  }
}
