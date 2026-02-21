import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';
import { captureException } from '../lib/sentry';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      statusCode: err.statusCode,
    });
    return;
  }

  const dbError = err as { code?: string };
  if (typeof dbError?.code === 'string' && /^P10[01]$/.test(dbError.code)) {
    res.status(503).json({
      error: 'DEPENDENCY_UNAVAILABLE',
      message:
        'Database connection failed. Ensure PostgreSQL is running, and check that migrations are applied.',
      statusCode: 503,
    });
    return;
  }

  if (dbError?.code === 'P2025') {
    res.status(404).json({
      error: 'NOT_FOUND',
      message:
        'The requested record was not found. Please verify your account and session, then try again.',
      statusCode: 404,
    });
    return;
  }

  if (dbError?.code === 'P2002') {
    res.status(409).json({
      error: 'CONFLICT',
      message: 'A resource with the same unique value already exists.',
      statusCode: 409,
    });
    return;
  }

  // Unknown error
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  captureException(err, { path: req.path, method: req.method }).catch(() => {});

  const isProd = process.env.NODE_ENV === 'production';
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: isProd ? 'An unexpected error occurred' : String(err),
    statusCode: 500,
  });
}
