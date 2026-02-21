import { logger } from '../../../lib/logger';
import { AppError } from '../../../lib/errors';
import { env } from '../../../config/env';

const TELEGRAM_API = 'https://api.telegram.org';

// ─────────────────────────────────────────────────────────────────
// Send
// ─────────────────────────────────────────────────────────────────

export async function send(
  chatId: string,
  content: string,
  creds: Record<string, string>,
): Promise<void> {
  const { botToken } = creds;

  if (!botToken) {
    throw new AppError('MISSING_CREDENTIALS', 422, 'Telegram credentials missing: botToken');
  }

  const url = `${TELEGRAM_API}/bot${botToken}/sendMessage`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: content,
      parse_mode: 'HTML',
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    logger.error({ status: resp.status, body, chatId }, 'Telegram send failed');
    throw new AppError('TELEGRAM_SEND_FAILED', 502, `Telegram API error: ${resp.status}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// Register webhook
// ─────────────────────────────────────────────────────────────────

export async function registerWebhook(botToken: string, workspaceSlug: string): Promise<void> {
  const webhookUrl = `${env.API_BASE_URL}/v1/webhooks/${workspaceSlug}/telegram`;

  const url = `${TELEGRAM_API}/bot${botToken}/setWebhook`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ['message'],
      drop_pending_updates: false,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new AppError('TELEGRAM_WEBHOOK_FAILED', 502, `Failed to register Telegram webhook: ${body}`);
  }

  const data = await resp.json() as any;
  if (!data.ok) {
    throw new AppError('TELEGRAM_WEBHOOK_FAILED', 502, `Telegram webhook error: ${data.description}`);
  }

  logger.info({ workspaceSlug, webhookUrl }, 'Telegram webhook registered');
}

// ─────────────────────────────────────────────────────────────────
// Parse inbound
// ─────────────────────────────────────────────────────────────────

export function parseInbound(
  body: any,
): { externalId: string; customerId: string; customerName?: string; content: string } | null {
  try {
    const message = body?.message;

    if (!message) return null;

    // Only handle text messages
    if (!message.text) {
      logger.debug({ type: Object.keys(message).join(',') }, 'Telegram: non-text message, skipping');
      return null;
    }

    const from = message.from;
    const chatId = String(message.chat?.id ?? from?.id);
    const userId = String(from?.id ?? chatId);
    const firstName = from?.first_name ?? '';
    const lastName = from?.last_name ?? '';
    const customerName = [firstName, lastName].filter(Boolean).join(' ') || undefined;

    return {
      externalId: String(message.message_id),
      customerId: chatId, // use chat ID so group/DM distinction is preserved
      customerName,
      content: message.text,
    };
  } catch (err) {
    logger.warn({ err }, 'Telegram parseInbound failed');
    return null;
  }
}
