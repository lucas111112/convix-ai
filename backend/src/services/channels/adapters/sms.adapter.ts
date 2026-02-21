import twilio from 'twilio';
import { logger } from '../../../lib/logger';
import { AppError } from '../../../lib/errors';

// ─────────────────────────────────────────────────────────────────
// Send
// ─────────────────────────────────────────────────────────────────

export async function send(
  to: string,
  content: string,
  creds: Record<string, string>,
): Promise<void> {
  const { accountSid, authToken, phoneNumber } = creds;

  if (!accountSid || !authToken || !phoneNumber) {
    throw new AppError(
      'MISSING_CREDENTIALS',
      422,
      'SMS credentials missing: accountSid, authToken, or phoneNumber',
    );
  }

  const client = twilio(accountSid, authToken);

  try {
    const msg = await client.messages.create({
      to,
      from: phoneNumber,
      body: content,
    });

    logger.info({ sid: msg.sid, to }, 'SMS sent successfully');
  } catch (err: any) {
    logger.error({ err, to }, 'Twilio SMS send failed');
    throw new AppError('SMS_SEND_FAILED', 502, `Twilio error: ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// Signature validation
// ─────────────────────────────────────────────────────────────────

export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
  authToken: string,
): boolean {
  return twilio.validateRequest(authToken, signature, url, params);
}

// ─────────────────────────────────────────────────────────────────
// Parse inbound
// ─────────────────────────────────────────────────────────────────

export function parseInbound(body: any): {
  externalId: string;
  customerId: string;
  content: string;
} {
  const externalId = String(body?.MessageSid ?? body?.SmsSid ?? Date.now());
  const customerId = String(body?.From ?? '');
  const content = String(body?.Body ?? '');

  return { externalId, customerId, content };
}
