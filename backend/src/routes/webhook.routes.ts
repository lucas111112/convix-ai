import { Router } from 'express';
import express from 'express';
import { prisma } from '../config/prisma';
import { dispatch, resolveFromSlug } from '../services/channels/dispatcher';
import * as whatsappAdapter from '../services/channels/adapters/whatsapp.adapter';
import * as telegramAdapter from '../services/channels/adapters/telegram.adapter';
import * as smsAdapter from '../services/channels/adapters/sms.adapter';
import * as voiceAdapter from '../services/channels/adapters/voice.adapter';
import * as slackAdapter from '../services/channels/adapters/slack.adapter';
import * as emailAdapter from '../services/channels/adapters/email.adapter';
import {
  handleCheckoutComplete,
  handleSubscriptionUpdate,
  handleSubscriptionCancelled,
  handlePaymentFailed,
} from '../services/billing/billing.service';
import { logger } from '../lib/logger';
import { env } from '../config/env';
import { AppError } from '../lib/errors';

export const webhookRouter = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getWorkspaceBySlug(slug: string) {
  const ws = await prisma.workspace.findUnique({ where: { slug } });
  if (!ws) throw new Error('Workspace not found');
  return ws;
}

/**
 * Returns a user-friendly fallback message for common error codes,
 * or null if the message should be silently dropped.
 */
function getFallbackMessage(err: unknown): string | null {
  if (!(err instanceof AppError)) {
    return "I'm sorry, something went wrong. Please try again later.";
  }
  switch (err.code) {
    case 'AGENT_INACTIVE':
      return "I'm sorry, this assistant is currently disabled. Please try again later.";
    case 'INSUFFICIENT_CREDITS':
      return "I'm sorry, this assistant is temporarily unavailable due to a billing issue. Please try again later.";
    case 'OUTSIDE_BUSINESS_HOURS':
      return "Thanks for reaching out! We're currently outside business hours. Please try again during our operating hours.";
    case 'CHANNEL_NOT_ENABLED':
    case 'NO_ACTIVE_AGENT':
    case 'WORKSPACE_NOT_FOUND':
      return null; // silently drop – no agent/channel configured yet
    default:
      return "I'm sorry, something went wrong. Please try again later.";
  }
}

/**
 * Sends a message via the Facebook Messenger Send API.
 */
async function sendMessengerMessage(
  recipientId: string,
  text: string,
  pageAccessToken: string,
): Promise<void> {
  const resp = await fetch('https://graph.facebook.com/v18.0/me/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pageAccessToken}`,
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    logger.error({ status: resp.status, body, recipientId }, 'Messenger send failed');
  }
}

// ── WhatsApp ──────────────────────────────────────────────────────────────────

// GET /:slug/whatsapp – Meta hub verification
webhookRouter.get(
  '/:slug/whatsapp',
  express.raw({ type: '*/*' }),
  async (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    try {
      const workspace = await getWorkspaceBySlug(req.params.slug);
      const { getDecryptedCredentials } = await import('../services/channel/channel.service');
      const creds = await getDecryptedCredentials(workspace.id, 'WHATSAPP');

      if (mode === 'subscribe' && token === creds.webhookVerifyToken) {
        return res.status(200).send(challenge);
      }
      res.sendStatus(403);
    } catch {
      res.sendStatus(403);
    }
  },
);

// POST /:slug/whatsapp – inbound message
webhookRouter.post(
  '/:slug/whatsapp',
  express.raw({ type: '*/*' }),
  async (req, res) => {
    res.sendStatus(200); // Acknowledge immediately

    try {
      const sig = req.headers['x-hub-signature-256'] as string;
      if (sig) {
        whatsappAdapter.verifySignature(req.body as Buffer, sig, env.WHATSAPP_APP_SECRET);
      }

      const body = JSON.parse((req.body as Buffer).toString());
      const parsed = whatsappAdapter.parseInbound(body);
      if (!parsed) return;

      const { workspaceId, agentId } = await resolveFromSlug(req.params.slug, 'WHATSAPP');

      const { getDecryptedCredentials } = await import('../services/channel/channel.service');
      const creds = await getDecryptedCredentials(workspaceId, 'WHATSAPP');

      let reply: string;
      try {
        const result = await dispatch({ workspaceId, agentId, channelType: 'WHATSAPP', ...parsed });
        reply = result.content;
      } catch (dispatchErr) {
        const fallback = getFallbackMessage(dispatchErr);
        if (!fallback) return;
        reply = fallback;
      }

      await whatsappAdapter.send(parsed.customerId, reply, creds);
    } catch (err) {
      logger.error({ err }, 'WhatsApp webhook error');
    }
  },
);

// ── Telegram ──────────────────────────────────────────────────────────────────

// POST /:slug/telegram
webhookRouter.post(
  '/:slug/telegram',
  express.json(),
  async (req, res) => {
    res.sendStatus(200);
    try {
      const parsed = telegramAdapter.parseInbound(req.body);
      if (!parsed) return;

      const { workspaceId, agentId } = await resolveFromSlug(req.params.slug, 'TELEGRAM');

      const { getDecryptedCredentials } = await import('../services/channel/channel.service');
      const creds = await getDecryptedCredentials(workspaceId, 'TELEGRAM');

      let reply: string;
      try {
        const result = await dispatch({ workspaceId, agentId, channelType: 'TELEGRAM', ...parsed });
        reply = result.content;
      } catch (dispatchErr) {
        const fallback = getFallbackMessage(dispatchErr);
        if (!fallback) return;
        reply = fallback;
      }

      await telegramAdapter.send(parsed.customerId, reply, creds);
    } catch (err) {
      logger.error({ err }, 'Telegram webhook error');
    }
  },
);

// ── Slack ─────────────────────────────────────────────────────────────────────

// POST /:slug/slack
webhookRouter.post(
  '/:slug/slack',
  express.json(),
  async (req, res) => {
    // Slack URL verification challenge
    if (req.body.type === 'url_verification') {
      return res.json({ challenge: req.body.challenge });
    }

    res.sendStatus(200);

    try {
      const parsed = slackAdapter.parseInbound(req.body);
      if (!parsed) return;

      const { workspaceId, agentId } = await resolveFromSlug(req.params.slug, 'SLACK');
      const result = await dispatch({ workspaceId, agentId, channelType: 'SLACK', ...parsed });

      const { getDecryptedCredentials } = await import('../services/channel/channel.service');
      const creds = await getDecryptedCredentials(workspaceId, 'SLACK');
      await slackAdapter.send(
        (parsed as any).metadata.channel,
        result.content,
        (parsed as any).metadata.threadTs,
        creds,
      );
    } catch (err) {
      logger.error({ err }, 'Slack webhook error');
    }
  },
);

// ── SMS (Twilio) ──────────────────────────────────────────────────────────────

// POST /:slug/sms
webhookRouter.post(
  '/:slug/sms',
  express.urlencoded({ extended: true }),
  async (req, res) => {
    try {
      const parsed = smsAdapter.parseInbound(req.body);
      const { workspaceId, agentId } = await resolveFromSlug(req.params.slug, 'SMS');

      let replyText: string;
      try {
        const result = await dispatch({ workspaceId, agentId, channelType: 'SMS', ...parsed });
        replyText = result.content;
      } catch (dispatchErr) {
        replyText = getFallbackMessage(dispatchErr) ?? "I'm sorry, this assistant is currently unavailable.";
      }

      res
        .type('text/xml')
        .send(`<Response><Message>${voiceAdapter.escapeXml(replyText)}</Message></Response>`);
    } catch (err) {
      logger.error({ err }, 'SMS webhook error');
      res
        .type('text/xml')
        .send('<Response><Message>Sorry, something went wrong.</Message></Response>');
    }
  },
);

// ── Voice (Twilio) ────────────────────────────────────────────────────────────

// POST /:slug/voice – initial call answer (returns TwiML)
webhookRouter.post(
  '/:slug/voice',
  express.urlencoded({ extended: true }),
  async (req, res) => {
    try {
      const { workspaceId, agentId } = await resolveFromSlug(req.params.slug, 'VOICE');
      const { getAgent } = await import('../services/agent/agent.service');
      const agent = await getAgent(workspaceId, agentId);
      res.type('text/xml').send(voiceAdapter.buildInitialTwiml(agent.name));
    } catch (err) {
      logger.error({ err }, 'Voice webhook error');
      const message = getFallbackMessage(err) ?? "I'm sorry, this assistant is currently unavailable. Goodbye.";
      res.type('text/xml').send(voiceAdapter.buildFallbackTwiml(message));
    }
  },
);

// POST /:slug/voice/turn – speech recognition result turn
webhookRouter.post(
  '/:slug/voice/turn',
  express.urlencoded({ extended: true }),
  async (req, res) => {
    try {
      const { SpeechResult, CallSid, From } = req.body;

      if (!SpeechResult) {
        return res.type('text/xml').send(voiceAdapter.buildNoInputTwiml());
      }

      const { workspaceId, agentId } = await resolveFromSlug(req.params.slug, 'VOICE');
      const result = await dispatch({
        workspaceId,
        agentId,
        channelType: 'VOICE',
        customerId: From,
        externalId: CallSid,
        content: SpeechResult,
        metadata: { callSid: CallSid },
      });

      const { getAgent } = await import('../services/agent/agent.service');
      const agent = await getAgent(workspaceId, agentId);
      res
        .type('text/xml')
        .send(voiceAdapter.buildResponseTwiml(result.content, (agent as any).ttsVoice));
    } catch (err) {
      logger.error({ err }, 'Voice turn error');
      const message = getFallbackMessage(err);
      if (message) {
        res.type('text/xml').send(voiceAdapter.buildFallbackTwiml(message));
      } else {
        res.type('text/xml').send(voiceAdapter.buildNoInputTwiml());
      }
    }
  },
);

// ── Email (SendGrid Inbound Parse) ────────────────────────────────────────────

// POST /:slug/email
webhookRouter.post(
  '/:slug/email',
  express.urlencoded({ extended: true }),
  async (req, res) => {
    res.sendStatus(200);
    try {
      const parsed = emailAdapter.parseInbound(req.body);
      const { workspaceId, agentId } = await resolveFromSlug(req.params.slug, 'EMAIL');

      let reply: string;
      try {
        const result = await dispatch({ workspaceId, agentId, channelType: 'EMAIL', ...parsed });
        reply = result.content;
      } catch (dispatchErr) {
        const fallback = getFallbackMessage(dispatchErr);
        if (!fallback) return;
        reply = fallback;
      }

      const { getDecryptedCredentials } = await import('../services/channel/channel.service');
      const creds = await getDecryptedCredentials(workspaceId, 'EMAIL');
      await emailAdapter.send(parsed.customerId, reply, creds, { subject: `Re: ${(parsed as any).metadata?.subject ?? 'Your message'}` });
    } catch (err) {
      logger.error({ err }, 'Email webhook error');
    }
  },
);

// ── Messenger (Meta) ──────────────────────────────────────────────────────────

// POST /:slug/messenger
webhookRouter.post(
  '/:slug/messenger',
  express.json(),
  async (req, res) => {
    res.sendStatus(200);
    try {
      const entry = req.body?.entry?.[0];
      const messaging = entry?.messaging?.[0];
      if (!messaging?.message?.text) return;

      const senderId = messaging.sender.id as string;
      const { workspaceId, agentId } = await resolveFromSlug(req.params.slug, 'MESSENGER');

      const { getDecryptedCredentials } = await import('../services/channel/channel.service');
      const creds = await getDecryptedCredentials(workspaceId, 'MESSENGER');

      let reply: string;
      try {
        const result = await dispatch({
          workspaceId,
          agentId,
          channelType: 'MESSENGER',
          customerId: senderId,
          externalId: messaging.message.mid,
          content: messaging.message.text,
        });
        reply = result.content;
      } catch (dispatchErr) {
        const fallback = getFallbackMessage(dispatchErr);
        if (!fallback) return;
        reply = fallback;
      }

      await sendMessengerMessage(senderId, reply, creds.pageAccessToken);
    } catch (err) {
      logger.error({ err }, 'Messenger webhook error');
    }
  },
);

// ── Stripe ────────────────────────────────────────────────────────────────────

// POST /stripe – no slug, uses raw body for signature verification
webhookRouter.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;

    try {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(env.STRIPE_SECRET_KEY ?? '', {
        apiVersion: '2024-12-18.acacia' as any,
      });
      const event = stripe.webhooks.constructEvent(
        req.body as Buffer,
        sig,
        env.STRIPE_WEBHOOK_SECRET ?? '',
      );

      res.sendStatus(200); // Acknowledge before async processing

      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutComplete(event.data.object as any);
          break;
        case 'customer.subscription.updated':
          await handleSubscriptionUpdate(event.data.object as any);
          break;
        case 'customer.subscription.deleted':
          await handleSubscriptionCancelled(event.data.object as any);
          break;
        case 'invoice.payment_failed':
          await handlePaymentFailed(event.data.object as any);
          break;
        default:
          // Unhandled event type – ignore
          break;
      }
    } catch (err) {
      logger.error({ err }, 'Stripe webhook error');
      res.sendStatus(400);
    }
  },
);
