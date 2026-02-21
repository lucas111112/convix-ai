import { PrismaClient } from '@prisma/client';
import { env } from './env';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'warn' },
          ]
        : [{ emit: 'stdout', level: 'error' }],
  });

if (env.NODE_ENV === 'development') {
  // Log slow queries (>500ms) during development
  (prisma as unknown as { $on: (event: string, cb: (e: { duration: number; query: string }) => void) => void }).$on(
    'query',
    (e) => {
      if (e.duration > 500) {
        console.warn(`Slow query (${e.duration}ms): ${e.query}`);
      }
    },
  );
  globalForPrisma.prisma = prisma;
}
