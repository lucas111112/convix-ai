import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import { verifyAccessToken } from '../services/auth/token.service';

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError('MISSING_TOKEN', 401, 'Missing authorization token');
    }

    const token = header.slice(7);
    const payload = verifyAccessToken(token);

    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      workspaceId: payload.workspaceId,
    };

    next();
  } catch (err) {
    next(err);
  }
}
