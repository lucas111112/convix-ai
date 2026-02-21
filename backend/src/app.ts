import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { redis } from './config/redis';
import { logger } from './lib/logger';
import { rateLimitGlobal } from './middleware/rateLimiter';
import { notFound } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';

export function createApp(): Application {
  const app = express();

  // 1. Security headers
  app.use(
    helmet({
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
    }),
  );

  // 2. CORS
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Workspace-Id'],
      exposedHeaders: ['X-Request-Id'],
    }),
  );

  // 3. Request logging (skip /health)
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === '/health',
      },
    }),
  );

  // 4. Global rate limiting
  app.use(rateLimitGlobal);

  // 5. Health check (before body parsing — no auth needed)
  app.get('/health', async (_req, res) => {
    const checks: Record<string, 'ok' | 'error'> = {};

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.db = 'ok';
    } catch {
      checks.db = 'error';
    }

    try {
      await redis.ping();
      checks.redis = 'ok';
    } catch {
      checks.redis = 'error';
    }

    const healthy = Object.values(checks).every((v) => v === 'ok');
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      checks,
      uptime: process.uptime(),
    });
  });

  // 6. Body parsing for non-webhook routes
  // Webhooks use express.raw() — applied per-route in webhooks.routes.ts
  app.use((req, res, next) => {
    if (req.path.startsWith('/v1/webhooks')) {
      return next();
    }
    express.json({ limit: '2mb' })(req, res, next);
  });

  // 7. Mount v1 routes (lazy import to avoid circular deps)
  app.use('/v1', (req, res, next) => {
    import('./routes/index')
      .then(({ router }) => router(req, res, next))
      .catch(next);
  });

  // 8. 404 handler
  app.use(notFound);

  // 9. Error handler (must be last)
  app.use(errorHandler);

  return app;
}
