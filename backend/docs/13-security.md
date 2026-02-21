# Security Model

## Middleware Stack (Order Matters)

```ts
// src/app.ts
app.use(helmet());                        // 1. Security headers
app.use(cors(corsOptions));               // 2. CORS
app.use(express.json({ limit: '2mb' })); // 3. Body parsing with size limit
app.use(rateLimiter);                     // 4. Global rate limiting
// Routes mount here
app.use('/v1', routes);
app.use(notFound);
app.use(errorHandler);
```

---

## Security Headers (Helmet)

```ts
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

---

## CORS

```ts
const corsOptions: cors.CorsOptions = {
  origin: env.FRONTEND_URL,
  credentials: true,              // required for cookies
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Request-Id'],
};
```

Webhook routes (`/v1/webhooks/*`) have their own more permissive CORS — they receive requests from external platforms (Meta, Twilio, Stripe) so they allow all origins but verify signatures instead.

---

## Rate Limiting

```ts
// src/middleware/rateLimiter.ts
import { RateLimiterRedis } from 'rate-limiter-flexible';

const globalLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl_global',
  points: 300,          // requests
  duration: 60,         // per minute
  blockDuration: 60,    // block for 1 minute if exceeded
});

const authLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl_auth',
  points: 10,
  duration: 900,        // per 15 minutes
});

// Per-user limit for authenticated routes
const userLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl_user',
  points: 120,
  duration: 60,
});
```

| Route group | Limit |
|---|---|
| All routes | 300 req/min per IP |
| `POST /auth/login` | 10 req/15min per IP |
| `POST /auth/register` | 5 req/hour per IP |
| Authenticated routes | 120 req/min per user |
| `POST /agents/:id/chat` | 30 req/min per user |
| Webhook routes | No limit (platform traffic) |

---

## Input Validation

Every route that accepts a body uses Zod schemas via the `validate()` middleware factory:

```ts
// src/middleware/validate.ts
import { ZodSchema } from 'zod';

export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new AppError('VALIDATION_ERROR', 400, result.error.message);
    }
    req.body = result.data;
    next();
  };
}
```

### String Sanitisation

All user-supplied strings are trimmed and length-limited via Zod:

```ts
const agentSchema = z.object({
  name: z.string().trim().min(1).max(100),
  systemPrompt: z.string().trim().min(10).max(10_000),
  handoffThreshold: z.number().min(0.3).max(0.9).optional(),
});
```

No raw SQL string interpolation ever. All DB access goes through Prisma parameterised queries.

---

## Webhook Signature Verification

Each external platform uses a different signature scheme:

| Platform | Verification |
|---|---|
| WhatsApp / Meta | `X-Hub-Signature-256` HMAC-SHA256 |
| Telegram | None built-in — we verify bot token in URL |
| Twilio (SMS/Voice) | `X-Twilio-Signature` HMAC-SHA1 of URL + params |
| Slack | `X-Slack-Signature` HMAC-SHA256 with timestamp replay prevention |
| Stripe | `Stripe-Signature` HMAC-SHA256 |
| SendGrid | IP allowlist (`185.234.181.0/24`) |

Twilio signature verification example:

```ts
import twilio from 'twilio';

function validateTwilioSignature(req: Request, res: Response, next: NextFunction) {
  const authToken = getChannelCreds(req.params.slug, 'SMS').authToken;
  const url = `${env.API_BASE_URL}${req.originalUrl}`;
  const signature = req.headers['x-twilio-signature'] as string;

  const isValid = twilio.validateRequest(authToken, signature, url, req.body);
  if (!isValid) throw new AppError('INVALID_SIGNATURE', 401);
  next();
}
```

---

## Credential Encryption

Channel API keys (WhatsApp tokens, Twilio auth tokens, etc.) are encrypted with AES-256-GCM before storage. The encryption key lives only in the environment (`CHANNEL_ENCRYPTION_KEY`).

See `src/lib/crypto.ts` in `07-channels.md` for full implementation.

Key rotation procedure:
1. Decrypt all credentials with old key
2. Re-encrypt with new key
3. Update env var
4. This is a manual, scheduled operation — automate with a migration script

---

## SQL Injection Prevention

Prisma uses parameterised queries by default. The only raw SQL used is the pgvector similarity search, which uses the Prisma `$queryRaw` tagged template that parameterises values automatically:

```ts
// SAFE — $queryRaw uses parameterised values
const chunks = await prisma.$queryRaw`
  SELECT content, 1 - (embedding <=> ${queryVec}::vector) AS similarity
  FROM knowledge_chunks
  WHERE agent_id = ${agentId}
  LIMIT 5
`;

// NEVER do this
const chunks = await prisma.$queryRawUnsafe(
  `SELECT * FROM knowledge_chunks WHERE agent_id = '${agentId}'`  // ← SQL injection
);
```

---

## Secrets Management

| Secret | Where stored | Access |
|---|---|---|
| `JWT_SECRET` | Environment variable | Backend only |
| `OPENAI_API_KEY` | Environment variable | Backend only |
| `CHANNEL_ENCRYPTION_KEY` | Environment variable | Backend only |
| `STRIPE_SECRET_KEY` | Environment variable | Backend only |
| `DATABASE_URL` | Environment variable | Backend only |
| Stripe Publishable Key | Frontend env (`NEXT_PUBLIC_`) | Frontend (safe to expose) |

In production: use Railway/Render secrets, or AWS Secrets Manager, or Doppler. Never commit secrets to git.

`.gitignore` must include:
```
.env
.env.local
.env.production
```

---

## Error Message Safety

Error responses never expose stack traces or internal implementation details in production:

```ts
// src/middleware/errorHandler.ts
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      statusCode: err.statusCode,
    });
  }

  // Unknown error — log + Sentry, return generic message
  logger.error({ err, path: req.path }, 'Unhandled error');
  Sentry.captureException(err);

  const isProd = env.NODE_ENV === 'production';
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: isProd ? 'An unexpected error occurred' : String(err),
    statusCode: 500,
  });
}
```

---

## Security Checklist for New Routes

Before shipping a route, verify:

- [ ] Route is behind `authenticate` middleware (unless intentionally public)
- [ ] Route is behind `requireWorkspace` if it touches tenant data
- [ ] Request body is validated with a Zod schema via `validate()`
- [ ] DB queries include `workspaceId` in WHERE clause
- [ ] No raw SQL string interpolation
- [ ] Sensitive fields (credentials, tokens) are not returned in responses
- [ ] Rate limiting is appropriate for the route
- [ ] External webhooks verify platform signature
