export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_TOKEN: 'MISSING_TOKEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
  AGENT_LIMIT_REACHED: 'AGENT_LIMIT_REACHED',
  WORKSPACE_NOT_FOUND: 'WORKSPACE_NOT_FOUND',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  NO_BILLING_ACCOUNT: 'NO_BILLING_ACCOUNT',
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function notFound(resource: string): AppError {
  return new AppError(ERROR_CODES.NOT_FOUND, 404, `${resource} not found`);
}

export function unauthorized(message = 'Unauthorized'): AppError {
  return new AppError(ERROR_CODES.UNAUTHORIZED, 401, message);
}

export function forbidden(message = 'Forbidden'): AppError {
  return new AppError(ERROR_CODES.FORBIDDEN, 403, message);
}

export function validationError(msg: string): AppError {
  return new AppError(ERROR_CODES.VALIDATION_ERROR, 400, msg);
}

export function conflict(resource: string): AppError {
  return new AppError(ERROR_CODES.CONFLICT, 409, `${resource} already exists`);
}

export function insufficientCredits(msg = 'Insufficient credits'): AppError {
  return new AppError(ERROR_CODES.INSUFFICIENT_CREDITS, 402, msg);
}

export function rateLimited(msg = 'Too many requests'): AppError {
  return new AppError(ERROR_CODES.RATE_LIMITED, 429, msg);
}

export function internalError(msg = 'Internal server error'): AppError {
  return new AppError(ERROR_CODES.INTERNAL_ERROR, 500, msg);
}
