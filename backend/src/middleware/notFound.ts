import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';

export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError('NOT_FOUND', 404, `${req.method} ${req.path} not found`));
}
