// ════════════════════════════════════════════════════════════
// lib/tokens.ts — JWT + refresh token helpers
// ════════════════════════════════════════════════════════════

import jwt          from 'jsonwebtoken'
import bcrypt       from 'bcrypt'
import crypto       from 'crypto'
import { env }      from '../config/env'
import { prisma }   from '../config/prisma'
import { redis }    from '../config/redis'

export interface JwtPayload {
  sub:      string  // userId
  email:    string
  role:     string
  branchId: string
}

// ── Access token (short-lived, 15 min) ──
export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    issuer:    'pharmpro-api',
    audience:  'pharmpro-client',
  })
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer:   'pharmpro-api',
    audience: 'pharmpro-client',
  }) as JwtPayload
}

// ── Refresh token (long-lived, 7 days) ──
// We store a bcrypt hash in DB, never the raw token.
export async function createRefreshToken(
  userId: string,
  ip?: string,
  ua?: string,
): Promise<string> {
  const raw   = crypto.randomBytes(64).toString('hex')
  const hash  = await bcrypt.hash(raw, 10) // lower rounds — token is random entropy
  const exp   = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await prisma.refreshToken.create({
    data: { userId, tokenHash: hash, expiresAt: exp, ipAddress: ip, userAgent: ua },
  })

  return raw // return only to caller — never persisted as plaintext
}

// ── Rotate refresh token (invalidate old, issue new) ──
export async function rotateRefreshToken(
  rawToken: string,
  ip?: string,
  ua?: string,
): Promise<{ accessToken: string; refreshToken: string; user: JwtPayload } | null> {
  // Find all non-revoked tokens and check each (we can't query by hash directly)
  const candidates = await prisma.refreshToken.findMany({
    where: { revokedAt: null, expiresAt: { gt: new Date() } },
    include: { user: { include: { branch: true } } },
    orderBy: { createdAt: 'desc' },
    take: 500, // cap scan — in production index on userId+status
  })

  let matched: (typeof candidates)[0] | null = null
  for (const c of candidates) {
    if (await bcrypt.compare(rawToken, c.tokenHash)) { matched = c; break }
  }

  if (!matched) return null

  // Revoke the old token
  await prisma.refreshToken.update({
    where: { id: matched.id },
    data:  { revokedAt: new Date() },
  })

  const u = matched.user
  const payload: JwtPayload = {
    sub:      u.id,
    email:    u.email,
    role:     u.role,
    branchId: u.branchId,
  }

  const newRaw    = await createRefreshToken(u.id, ip, ua)
  const newAccess = signAccessToken(payload)

  return { accessToken: newAccess, refreshToken: newRaw, user: payload }
}

// ── Revoke all tokens for a user (logout all devices) ──
export async function revokeAllTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data:  { revokedAt: new Date() },
  })
  // Also clear any cached session in Redis
  await redis.del(`session:${userId}`)
}

// ── Blacklist an access token for its remaining TTL ──
// Prevents use after logout until it naturally expires
export async function blacklistAccessToken(token: string, expiresAt: number): Promise<void> {
  const ttl = Math.max(0, expiresAt - Math.floor(Date.now() / 1000))
  if (ttl > 0) await redis.setex(`bl:${token}`, ttl, '1')
}

export async function isAccessTokenBlacklisted(token: string): Promise<boolean> {
  return (await redis.exists(`bl:${token}`)) === 1
}


