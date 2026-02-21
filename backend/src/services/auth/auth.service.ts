import bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../lib/errors';
import {
  signAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
} from './token.service';
import { env } from '../../config/env';

const BCRYPT_ROUNDS = 12;

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 20);
  const random = Math.random().toString(36).slice(2, 8);
  return `${base}-${random}`;
}

export async function register(
  email: string,
  password: string,
  name: string,
): Promise<{
  user: { id: string; email: string; name: string; role: UserRole };
  workspace: { id: string; name: string; slug: string };
  accessToken: string;
  refreshToken: string;
}> {
  // Check for existing user
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    throw new AppError('CONFLICT', 409, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Create user, workspace, membership in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
        role: UserRole.OWNER,
      },
    });

    const workspace = await tx.workspace.create({
      data: {
        name: `${name}'s Workspace`,
        slug: generateSlug(name),
        plan: 'STARTER',
      },
    });

    await tx.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId: workspace.id,
        role: UserRole.OWNER,
      },
    });

    // Grant starter credits
    await tx.creditLedger.create({
      data: {
        workspaceId: workspace.id,
        delta: 500,
        reason: 'PLAN_GRANT',
        balance: 500,
      },
    });

    return { user, workspace };
  });

  const refreshToken = generateRefreshToken();
  await storeRefreshToken(result.user.id, refreshToken, env.REFRESH_TOKEN_EXPIRES_IN);

  const accessToken = signAccessToken({
    sub: result.user.id,
    email: result.user.email,
    name: result.user.name,
    role: UserRole.OWNER,
    workspaceId: result.workspace.id,
  });

  return {
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
    },
    workspace: {
      id: result.workspace.id,
      name: result.workspace.name,
      slug: result.workspace.slug,
    },
    accessToken,
    refreshToken,
  };
}

export async function login(
  email: string,
  password: string,
): Promise<{
  user: { id: string; email: string; name: string; role: UserRole };
  workspace: { id: string; name: string; slug: string };
  accessToken: string;
  refreshToken: string;
}> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      workspaceMemberships: {
        include: { workspace: true },
        orderBy: { joinedAt: 'asc' },
        take: 1,
      },
    },
  });

  // Generic message to prevent user enumeration
  if (!user) {
    throw new AppError('UNAUTHORIZED', 401, 'Invalid email or password');
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    throw new AppError('UNAUTHORIZED', 401, 'Invalid email or password');
  }

  const primaryMembership = user.workspaceMemberships[0];
  if (!primaryMembership) {
    throw new AppError('WORKSPACE_NOT_FOUND', 404, 'No workspace found for this user');
  }

  const refreshToken = generateRefreshToken();
  await storeRefreshToken(user.id, refreshToken, env.REFRESH_TOKEN_EXPIRES_IN);

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: primaryMembership.role,
    workspaceId: primaryMembership.workspaceId,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: primaryMembership.role,
    },
    workspace: {
      id: primaryMembership.workspace.id,
      name: primaryMembership.workspace.name,
      slug: primaryMembership.workspace.slug,
    },
    accessToken,
    refreshToken,
  };
}

export async function logout(refreshToken: string): Promise<void> {
  await revokeRefreshToken(refreshToken);
}

export async function refreshTokens(
  oldRefreshToken: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  return rotateRefreshToken(oldRefreshToken);
}

export async function getMe(userId: string): Promise<{
  id: string;
  email: string;
  name: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: Date;
}> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
      createdAt: true,
    },
  });
  return user;
}
