import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    service: 'axon-api',
    env: process.env.NODE_ENV,
  },
  redact: {
    paths: [
      'req.headers.authorization',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.accessToken',
      '*.refreshToken',
      '*.apiKey',
      '*.secretKey',
    ],
    censor: '[REDACTED]',
  },
});
