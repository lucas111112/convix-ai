import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { addMilliseconds } from 'date-fns';
import { UserRole } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';
import { hashToken } from '../../lib/crypto';
import { AppError } from '../../lib/errors';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  workspaceId?: string;
  iat?: number;
  exp?: number;
}

export function signAccessToken(payload: Omit<AccessTokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
    return decoded;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError('INVALID_TOKEN', 401, 'Access token has expired');
    }
    throw new AppError('INVALID_TOKEN', 401, 'Invalid access token');
  }
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

export function hashRefreshToken(token: string): string {
  return hashToken(token);
}

function parseExpiresIn(expiresIn: string): number {
  // Parse "30d" -> milliseconds
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const [, amount, unit] = match;
  const n = parseInt(amount, 10);
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return n * (multipliers[unit] ?? multipliers['d']);
}

export async function storeRefreshToken(
  userId: string,
  rawToken: string,
  expiresIn: string,
): Promise<void> {
  const tokenHash = hashRefreshToken(rawToken);
  const expiresAt = addMilliseconds(new Date(), parseExpiresIn(expiresIn));

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });
}

export async function rotateRefreshToken(
  oldToken: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const oldHash = hashRefreshToken(oldToken);

  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash: oldHash },
    include: {
      user: {
        include: {
          workspaceMemberships: {
            include: { workspace: true },
            take: 1,
            orderBy: { joinedAt: 'asc' },
          },
        },
      },
    },
  });

  if (!storedToken) {
    throw new AppError('INVALID_TOKEN', 401, 'Refresh token not found');
  }

  if (storedToken.revokedAt) {
    // Token was already used — potential token theft, revoke all
    await prisma.refreshToken.updateMany({
      where: { userId: storedToken.userId },
      data: { revokedAt: new Date() },
    });
    throw new AppError('INVALID_TOKEN', 401, 'Refresh token has been revoked');
  }

  if (storedToken.expiresAt < new Date()) {
    throw new AppError('INVALID_TOKEN', 401, 'Refresh token has expired');
  }

  // Revoke old token
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() },
  });

  const { user } = storedToken;
  const primaryMembership = user.workspaceMemberships[0];

  // Issue new tokens
  const newRefreshToken = generateRefreshToken();
  await storeRefreshToken(user.id, newRefreshToken, env.REFRESH_TOKEN_EXPIRES_IN);

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: primaryMembership?.role ?? user.role,
    workspaceId: primaryMembership?.workspaceId,
  });

  return { accessToken, refreshToken: newRefreshToken };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const tokenHash = hashRefreshToken(token);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
