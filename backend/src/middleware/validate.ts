import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../lib/errors';

export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues
        .map(i => `${i.path.join('.')}: ${i.message}`)
        .join(', ');
      return next(new AppError('VALIDATION_ERROR', 400, message));
    }
    req.body = result.data;
    next();
  };
}
