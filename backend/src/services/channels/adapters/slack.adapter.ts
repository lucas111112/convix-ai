import { logger } from '../../../lib/logger';
import { AppError } from '../../../lib/errors';

const SLACK_API = 'https://slack.com/api';

// ─────────────────────────────────────────────────────────────────
// Send
// ─────────────────────────────────────────────────────────────────

export async function send(
  channel: string,
  text: string,
  threadTs: string,
  creds: Record<string, string>,
): Promise<void> {
  const { botToken } = creds;

  if (!botToken) {
    throw new AppError('MISSING_CREDENTIALS', 422, 'Slack credentials missing: botToken');
  }

  const payload: Record<string, unknown> = {
    channel,
    text,
    mrkdwn: true,
  };

  // Reply in thread if we have a thread timestamp
  if (threadTs) {
    payload.thread_ts = threadTs;
  }

  const resp = await fetch(`${SLACK_API}/chat.postMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${botToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const body = await resp.text();
    logger.error({ status: resp.status, body, channel }, 'Slack send HTTP error');
    throw new AppError('SLACK_SEND_FAILED', 502, `Slack API HTTP error: ${resp.status}`);
  }

  const data = await resp.json() as any;

  if (!data.ok) {
    logger.error({ error: data.error, channel }, 'Slack API returned error');
    throw new AppError('SLACK_SEND_FAILED', 502, `Slack API error: ${data.error}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// Parse inbound
// ─────────────────────────────────────────────────────────────────

export function parseInbound(body: any): {
  externalId: string;
  customerId: string;
  content: string;
  metadata: { channel: string; threadTs: string };
} | null {
  try {
    const event = body?.event;

    // Only handle message events; ignore bot messages and subtypes (edits, joins, etc.)
    if (event?.type !== 'message') return null;
    if (event?.bot_id) return null;
    if (event?.subtype) return null; // channel_join, message_changed, etc.

    const content = event?.text;
    if (!content) return null;

    const channel = event?.channel ?? '';
    const threadTs = event?.thread_ts ?? event?.ts ?? '';
    const userId = event?.user ?? '';
    const ts = event?.ts ?? Date.now().toString();

    return {
      externalId: ts,
      customerId: userId,
      content,
      metadata: { channel, threadTs },
    };
  } catch (err) {
    logger.warn({ err }, 'Slack parseInbound failed');
    return null;
  }
}
