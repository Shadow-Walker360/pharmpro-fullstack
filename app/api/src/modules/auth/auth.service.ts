import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { randomUUID, randomBytes, createHash } from 'crypto';
import { prisma } from '../../config/prisma';
import { redis } from '../../config/redis';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { ApiError } from '../../lib/errors';
import type { LoginInput, ChangePasswordInput } from './auth.schema';

// ── Token helpers ────────────────────────────────────────────────────────
interface AccessTokenPayload {
  sub: string;
  role: string;
  branchId: string;
  jti: string;
}

function signAccessToken(user: { id: string; role: string; branchId: string }): { token: string; jti: string; expiresInSeconds: number } {
  const jti = randomUUID();
  const token = jwt.sign(
    { sub: user.id, role: user.role, branchId: user.branchId, jti } satisfies AccessTokenPayload,
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRY },
  );
  // Used to set the Redis blacklist TTL correctly on logout — must match
  // the token's real remaining lifetime, not an arbitrary constant.
  const decoded = jwt.decode(token) as { exp: number; iat: number };
  return { token, jti, expiresInSeconds: decoded.exp - decoded.iat };
}

function hashToken(plaintext: string): string {
  // Refresh tokens are stored hashed, same principle as passwords — if the
  // DB leaks, raw refresh tokens must not be usable directly from the dump.
  return createHash('sha256').update(plaintext).digest('hex');
}

async function issueRefreshToken(userId: string): Promise<string> {
  const plaintext = randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + env.JWT_REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: { userId, tokenHash: hashToken(plaintext), expiresAt, isRevoked: false },
  });

  return plaintext;
}

// ── Login ────────────────────────────────────────────────────────────────
export async function login(input: LoginInput, ipAddress: string) {
  const user = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      ...(input.email ? { email: input.email } : { phone: input.phone }),
    },
  });

  // Constant-time comparison even when no user exists, so response timing
  // doesn't reveal whether an email/phone is registered. argon2.verify
  // against a fixed dummy hash keeps the timing profile consistent.
  const DUMMY_HASH = '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$dGhpc2lzYWR1bW15aGFzaA';
  const isValidPassword = await argon2.verify(user?.passwordHash ?? DUMMY_HASH, input.password).catch(() => false);

  if (!user || !isValidPassword) {
    throw ApiError.unauthorized('Invalid credentials');
  }
  if (!user.isActive) {
    throw ApiError.forbidden('This account has been suspended. Contact your administrator.');
  }

  const { token: accessToken, expiresInSeconds } = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id);

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  logger.info({ userId: user.id, ipAddress }, 'User logged in');

  return {
    accessToken,
    refreshToken,
    expiresInSeconds,
    user: {
      id: user.id, fullName: user.fullName, email: user.email, phone: user.phone,
      role: user.role, branchId: user.branchId, mustChangePassword: user.mustChangePassword,
    },
  };
}

// ── Refresh token rotation ───────────────────────────────────────────────
export async function refreshTokens(oldPlaintextToken: string) {
  const tokenHash = hashToken(oldPlaintextToken);

  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, role: true, branchId: true, isActive: true } } },
  });

  if (!existing) throw ApiError.unauthorized('Invalid refresh token');

  if (existing.isRevoked) {
    // Reuse of an already-rotated token is the stolen-token-chain signal —
    // in a hardened setup this should also revoke every other token for
    // this user, since it means a refresh token was captured and replayed.
    logger.warn({ userId: existing.userId }, 'Revoked refresh token was reused — possible token theft');
    await prisma.refreshToken.updateMany({ where: { userId: existing.userId, isRevoked: false }, data: { isRevoked: true } });
    throw ApiError.unauthorized('Refresh token has been revoked');
  }

  if (existing.expiresAt < new Date()) {
    throw ApiError.unauthorized('Refresh token has expired — please log in again');
  }

  if (!existing.user?.isActive) {
    throw ApiError.forbidden('Account is suspended');
  }

  // Rotate: revoke the old one, issue a new one. Every refresh invalidates
  // the token that was just used — a stolen token chain dies the moment
  // the legitimate user's next refresh happens.
  await prisma.refreshToken.update({ where: { id: existing.id }, data: { isRevoked: true } });
  const newRefreshToken = await issueRefreshToken(existing.userId);
  const { token: accessToken, expiresInSeconds } = signAccessToken(existing.user);

  return { accessToken, refreshToken: newRefreshToken, expiresInSeconds };
}

// ── Logout ───────────────────────────────────────────────────────────────
export async function logout(accessTokenJti: string, accessTokenExpiresInSeconds: number, refreshPlaintextToken?: string) {
  // Blacklist the access token immediately — it stays valid cryptographically
  // until it naturally expires, so authenticate.ts checks this blacklist
  // on every request rather than trusting the JWT signature alone.
  if (accessTokenExpiresInSeconds > 0) {
    await redis.set(`blacklist:${accessTokenJti}`, '1', 'EX', accessTokenExpiresInSeconds);
  }

  if (refreshPlaintextToken) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshPlaintextToken) },
      data: { isRevoked: true },
    });
  }
}

// ── Revoke all sessions (password change, role change, suspension) ──────
export async function revokeAllTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({ where: { userId, isRevoked: false }, data: { isRevoked: true } });

  // Access tokens already issued can't be individually blacklisted without
  // knowing every jti — instead, bump a per-user "tokens valid since"
  // marker that authenticate.ts can optionally check for tighter guarantees.
  await redis.set(`tokens-valid-since:${userId}`, String(Date.now()), 'EX', 60 * 60 * 24 * 7);
}

// ── Change password ──────────────────────────────────────────────────────
export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('User not found');

  const isValid = await argon2.verify(user.passwordHash, input.currentPassword);
  if (!isValid) throw ApiError.badRequest('Current password is incorrect');

  const newHash = await argon2.hash(input.newPassword, { type: argon2.argon2id });
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash, mustChangePassword: false } });

  await revokeAllTokens(userId); // force re-login everywhere else after a password change

  logger.info({ userId }, 'Password changed — all sessions revoked');
}

export async function getMe(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, fullName: true, email: true, phone: true, role: true, branchId: true, mustChangePassword: true, lastLoginAt: true },
  });
  if (!user) throw ApiError.notFound('User not found');
  return user;
}