import { logger } from '../../lib/logger';
import { AppError } from '../../lib/errors';
import { getDecryptedCredentials } from '../channel/channel.service';
import { webhookRetryQueue } from '../../queues/queue';
import * as whatsapp from './adapters/whatsapp.adapter';
import * as telegram from './adapters/telegram.adapter';
import * as sms from './adapters/sms.adapter';
import * as slack from './adapters/slack.adapter';
import * as email from './adapters/email.adapter';

// ─────────────────────────────────────────────────────────────────
// Outbound message sender
// ─────────────────────────────────────────────────────────────────

/**
 * Routes an outbound message to the correct channel adapter.
 * On failure, enqueues a retry job via BullMQ.
 */
export async function sendMessage(
  channelType: string,
  customerId: string,
  content: string,
  workspaceId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const creds = await getDecryptedCredentials(workspaceId, channelType as any);

    switch (channelType) {
      case 'WHATSAPP':
        await whatsapp.send(customerId, content, creds);
        break;

      case 'TELEGRAM':
        await telegram.send(customerId, content, creds);
        break;

      case 'SMS':
        await sms.send(customerId, content, creds);
        break;

      case 'SLACK': {
        const channel = (metadata?.slackChannel as string) ?? customerId;
        const threadTs = (metadata?.threadTs as string) ?? '';
        await slack.send(channel, content, threadTs, creds);
        break;
      }

      case 'EMAIL': {
        const subject = metadata?.subject as string | undefined;
        await email.send(customerId, content, creds, { subject });
        break;
      }

      case 'VOICE':
        // Voice responses are handled via TwiML in the webhook response; no outbound push needed
        logger.debug({ channelType, customerId }, 'Voice channel: reply handled via TwiML');
        break;

      case 'WEB':
        // Web widget replies are pushed via Socket.IO in the pipeline; no adapter needed
        logger.debug({ channelType, customerId }, 'Web channel: reply emitted via socket');
        break;

      default:
        logger.warn({ channelType }, 'Unknown channel type, cannot send message');
        throw new AppError('UNSUPPORTED_CHANNEL', 422, `Unsupported channel type: ${channelType}`);
    }

    logger.info({ channelType, customerId, workspaceId }, 'Message sent successfully');
  } catch (err) {
    logger.error({ err, channelType, customerId, workspaceId }, 'Failed to send message, enqueueing retry');

    // Enqueue retry job
    try {
      await webhookRetryQueue.add(
        'send-message-retry',
        { channelType, customerId, content, workspaceId, metadata },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      );
    } catch (queueErr) {
      logger.error({ queueErr }, 'Failed to enqueue retry job');
    }

    throw err;
  }
}
