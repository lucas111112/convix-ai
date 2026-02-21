import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.REDIS_URL, {
  retryStrategy(times) {
    const delay = Math.min(times * 50, 3000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  lazyConnect: true,
});

redis.on('error', (err: Error) => {
  if (env.NODE_ENV !== 'test') {
    console.error('Redis error:', err.message);
  }
});
