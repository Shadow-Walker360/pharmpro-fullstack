import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { redis } from '../config/redis';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { ApiError } from '../lib/errors';

export interface AuthenticatedUser {
  id: string;
  role: string;
  branchId: string;
  fullName: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user: AuthenticatedUser;
      branchId: string;
      branchCode: string;
    }
  }
}

interface AccessTokenPayload {
  sub: string;   // user id
  role: string;
  branchId: string;
  jti: string;   // token id — used for the blacklist check on logout
}

/**
 * Verifies the JWT access token on every protected request. Checks the
 * Redis blacklist first (set on logout/revokeAllTokens) so a token that's
 * cryptographically valid but explicitly revoked is still rejected — this
 * is what makes logout and forced-revocation actually immediate rather
 * than "valid until it naturally expires in 15 minutes."
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Missing or malformed Authorization header');
    }
    const token = header.slice('Bearer '.length);

    let payload: AccessTokenPayload;
    try {
      payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) throw ApiError.unauthorized('Access token expired');
      throw ApiError.unauthorized('Invalid access token');
    }

    const isBlacklisted = await redis.get(`blacklist:${payload.jti}`);
    if (isBlacklisted) throw ApiError.unauthorized('Token has been revoked — please log in again');

    // Re-check the user on every request rather than trusting the JWT
    // payload alone — a suspended account must lose access immediately,
    // not wait for its 15-minute access token to expire naturally.
    const user = await prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      select: { id: true, role: true, branchId: true, fullName: true, isActive: true },
    });
    if (!user) throw ApiError.unauthorized('User not found');
    if (!user.isActive) throw ApiError.forbidden('This account has been suspended');

    req.user = { id: user.id, role: user.role, branchId: user.branchId, fullName: user.fullName };
    next();
  } catch (err) {
    next(err);
  }
}