import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { redis } from '../config/redis';

export const globalLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl_global',
  points: 300,
  duration: 60,
  blockDuration: 60,
});

export const authLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl_auth',
  points: 10,
  duration: 900,
  blockDuration: 900,
});

export const userLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl_user',
  points: 120,
  duration: 60,
  blockDuration: 60,
});

function getIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

export function rateLimitGlobal(req: Request, res: Response, next: NextFunction): void {
  const ip = getIp(req);
  globalLimiter
    .consume(ip)
    .then(() => next())
    .catch((rlRes) => {
      const retryAfter = Math.ceil((rlRes as { msBeforeNext: number }).msBeforeNext / 1000);
      res.setHeader('Retry-After', retryAfter);
      res.status(429).json({
        error: 'RATE_LIMITED',
        message: 'Too many requests, please try again later',
        statusCode: 429,
      });
    });
}

export function rateLimitAuth(req: Request, res: Response, next: NextFunction): void {
  const ip = getIp(req);
  authLimiter
    .consume(ip)
    .then(() => next())
    .catch((rlRes) => {
      const retryAfter = Math.ceil((rlRes as { msBeforeNext: number }).msBeforeNext / 1000);
      res.setHeader('Retry-After', retryAfter);
      res.status(429).json({
        error: 'RATE_LIMITED',
        message: 'Too many authentication attempts, please try again later',
        statusCode: 429,
      });
    });
}

export function rateLimitUser(req: Request, res: Response, next: NextFunction): void {
  const userId = req.user?.id || getIp(req);
  userLimiter
    .consume(userId)
    .then(() => next())
    .catch((rlRes) => {
      const retryAfter = Math.ceil((rlRes as { msBeforeNext: number }).msBeforeNext / 1000);
      res.setHeader('Retry-After', retryAfter);
      res.status(429).json({
        error: 'RATE_LIMITED',
        message: 'Too many requests, please slow down',
        statusCode: 429,
      });
    });
}
