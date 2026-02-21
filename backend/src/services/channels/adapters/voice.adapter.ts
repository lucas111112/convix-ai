import twilio from 'twilio';
import { logger } from '../../../lib/logger';
import { AppError } from '../../../lib/errors';
import { env } from '../../../config/env';

// ─────────────────────────────────────────────────────────────────
// TwiML builders
// ─────────────────────────────────────────────────────────────────

/**
 * Initial TwiML when a call first connects.
 * Greets the caller and opens a speech gather for the first turn.
 */
export function buildInitialTwiml(agentName: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Hello! You're speaking with ${escapeXml(agentName)}. How can I help you today?</Say>
  <Gather input="speech" speechTimeout="3" speechModel="phone_call" action="./turn" method="POST">
    <Say voice="Polly.Joanna">Please go ahead and speak after the tone.</Say>
  </Gather>
  <Say voice="Polly.Joanna">I didn't catch that. Please call again if you need help.</Say>
</Response>`;
}

/**
 * TwiML response for a conversation turn.
 * Speaks the AI's response and opens the next gather.
 */
export function buildResponseTwiml(content: string, ttsVoice?: string): string {
  const voice = escapeXml(ttsVoice ?? 'Polly.Joanna');
  const safeContent = escapeXml(content);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}">${safeContent}</Say>
  <Gather input="speech" speechTimeout="3" speechModel="phone_call" action="./turn" method="POST">
  </Gather>
  <Say voice="${voice}">I didn't catch that. Could you please repeat?</Say>
  <Gather input="speech" speechTimeout="5" speechModel="phone_call" action="./turn" method="POST">
  </Gather>
  <Hangup/>
</Response>`;
}

/**
 * TwiML fallback when the agent is disabled or an error occurred.
 */
export function buildFallbackTwiml(message: string, voice = 'Polly.Joanna'): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}">${escapeXml(message)}</Say>
  <Hangup/>
</Response>`;
}

/**
 * TwiML response when no input was detected.
 */
export function buildNoInputTwiml(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Sorry, I didn't catch that. Could you repeat?</Say>
  <Gather input="speech" speechTimeout="5" speechModel="phone_call" action="./turn" method="POST">
  </Gather>
  <Say voice="Polly.Joanna">I'm having trouble hearing you. Please try calling again.</Say>
  <Hangup/>
</Response>`;
}

// ─────────────────────────────────────────────────────────────────
// Outbound call
// ─────────────────────────────────────────────────────────────────

/**
 * Initiates an outbound Twilio Voice call pointing to our voice webhook.
 */
export async function initiateOutboundCall(
  to: string,
  agentId: string,
  workspaceSlug: string,
  creds: Record<string, string>,
): Promise<void> {
  const { accountSid, authToken, phoneNumber } = creds;

  if (!accountSid || !authToken || !phoneNumber) {
    throw new AppError(
      'MISSING_CREDENTIALS',
      422,
      'Voice credentials missing: accountSid, authToken, or phoneNumber',
    );
  }

  const twimlUrl = `${env.API_BASE_URL}/v1/webhooks/${workspaceSlug}/voice/inbound?agentId=${agentId}`;

  const client = twilio(accountSid, authToken);

  try {
    const call = await client.calls.create({
      to,
      from: phoneNumber,
      url: twimlUrl,
      method: 'POST',
    });

    logger.info({ sid: call.sid, to, agentId }, 'Outbound voice call initiated');
  } catch (err: any) {
    logger.error({ err, to }, 'Twilio outbound call failed');
    throw new AppError('VOICE_CALL_FAILED', 502, `Twilio error: ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────
// XML escape utility
// ─────────────────────────────────────────────────────────────────

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
