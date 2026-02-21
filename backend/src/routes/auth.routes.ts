import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';
import { rateLimitAuth } from '../middleware/rateLimiter';
import * as AuthService from '../services/auth/auth.service';
import { env } from '../config/env';
import { AppError } from '../lib/errors';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Parse a named cookie value from the raw Cookie header without requiring cookie-parser.
 */
function getCookieValue(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function setRefreshCookie(res: Response, token: string): void {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/v1/auth',
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie('refreshToken', { path: '/v1/auth' });
}

// POST /v1/auth/register
router.post(
  '/register',
  rateLimitAuth,
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user, workspace, accessToken, refreshToken } = await AuthService.register(
        req.body.email,
        req.body.password,
        req.body.name,
      );
      setRefreshCookie(res, refreshToken);
      res.status(201).json({ user, workspace, accessToken });
    } catch (err) {
      next(err);
    }
  },
);

// POST /v1/auth/login
router.post(
  '/login',
  rateLimitAuth,
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user, workspace, accessToken, refreshToken } = await AuthService.login(
        req.body.email,
        req.body.password,
      );
      setRefreshCookie(res, refreshToken);
      res.json({ user, workspace, accessToken });
    } catch (err) {
      next(err);
    }
  },
);

// POST /v1/auth/refresh
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const oldToken = getCookieValue(req.headers.cookie, 'refreshToken');
    if (!oldToken) {
      throw new AppError('MISSING_TOKEN', 401, 'No refresh token provided');
    }
    const { accessToken, refreshToken } = await AuthService.refreshTokens(oldToken);
    setRefreshCookie(res, refreshToken);
    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
});

// POST /v1/auth/logout
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = getCookieValue(req.headers.cookie, 'refreshToken');
    if (token) {
      await AuthService.logout(token);
    }
    clearRefreshCookie(res);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /v1/auth/me
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new AppError('UNAUTHORIZED', 401, 'Unauthorized');
    const user = await AuthService.getMe(req.user.id);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export { router as authRouter };
