import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().optional(),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),
  FRONTEND_URL: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  CHANNEL_ENCRYPTION_KEY: z.string().length(64), // 32 bytes = 64 hex chars
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  API_BASE_URL: z.string().default('http://localhost:3001'),
  OPENAI_MODEL: z.string().default('gpt-5-nano'),
  WHATSAPP_APP_SECRET: z.string().optional().default(''),
  STRIPE_BUILDER_PRICE_ID: z.string().optional().default(''),
  STRIPE_PRO_PRICE_ID: z.string().optional().default(''),
});

const result = envSchema.safeParse(process.env);
if (!result.success) {
  const missing = result.error.issues.map((i) => i.path.join('.')).join(', ');
  throw new Error(`Invalid environment variables: ${missing}\n${result.error.message}`);
}

export const env = result.data;
