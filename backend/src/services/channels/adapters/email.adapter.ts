import { Resend } from 'resend';
import { logger } from '../../../lib/logger';
import { AppError } from '../../../lib/errors';
import { env } from '../../../config/env';

// ─────────────────────────────────────────────────────────────────
// Send
// ─────────────────────────────────────────────────────────────────

export async function send(
  to: string,
  content: string,
  creds: Record<string, string>,
  metadata?: { subject?: string },
): Promise<void> {
  const apiKey = env.RESEND_API_KEY;

  if (!apiKey) {
    throw new AppError('MISSING_CREDENTIALS', 422, 'Resend API key not configured');
  }

  const fromAddress = creds.fromAddress ?? env.RESEND_FROM;
  if (!fromAddress) {
    throw new AppError('MISSING_CREDENTIALS', 422, 'Email fromAddress not configured');
  }

  const resend = new Resend(apiKey);

  const subject = metadata?.subject ?? 'Reply from Support';

  // Convert plain text to simple HTML, preserving line breaks
  const htmlContent = content
    .split('\n')
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('');

  try {
    const result = await resend.emails.send({
      from: fromAddress,
      to,
      subject,
      html: `<div style="font-family: sans-serif; line-height: 1.6;">${htmlContent}</div>`,
      text: content,
    });

    logger.info({ id: result.data?.id, to }, 'Email sent successfully');
  } catch (err: any) {
    logger.error({ err, to }, 'Resend email send failed');
    throw new AppError('EMAIL_SEND_FAILED', 502, `Email send error: ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// Parse inbound (webhook from email provider)
// ─────────────────────────────────────────────────────────────────

export function parseInbound(body: any): {
  externalId: string;
  customerId: string;
  content: string;
  metadata: { subject: string; from: string };
} {
  const from = String(body?.from ?? '');
  const subject = String(body?.subject ?? '');
  const rawText = body?.text ?? (body?.html ? stripHtml(String(body.html)) : '');
  const content = String(rawText).trim();
  const externalId = String(body?.['message-id'] ?? body?.messageId ?? Date.now());

  const customerId = parseEmailAddress(from);

  return {
    externalId,
    customerId,
    content,
    metadata: { subject, from },
  };
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  // Remove script and style blocks
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  // Replace block elements with newlines
  text = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n');

  // Remove all remaining tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // Collapse multiple blank lines
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return text;
}

function parseEmailAddress(from: string): string {
  // Match "Display Name <email@example.com>" format
  const match = from.match(/<([^>]+)>/);
  if (match && match[1]) return match[1].trim().toLowerCase();

  // Fallback: return as-is if already looks like an email
  const trimmed = from.trim().toLowerCase();
  return trimmed;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
