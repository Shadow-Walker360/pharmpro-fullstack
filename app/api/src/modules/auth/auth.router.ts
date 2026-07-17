import { Router, type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { loginRateLimiter } from '../../middleware/rateLimiter';
import { env } from '../../config/env';
import { ApiError } from '../../lib/errors';
import { loginSchema, changePasswordSchema } from './auth.schema';
import * as authService from './auth.service';

const router = Router();

const REFRESH_COOKIE_NAME = 'pharmpro_refresh';
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/auth',
  maxAge: env.JWT_REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
};

// ── POST /api/auth/login ─────────────────────────────────────────────────
router.post('/login', loginRateLimiter, validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.login(req.body, req.ip ?? 'unknown');

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({
      data: {
        accessToken: result.accessToken,
        expiresInSeconds: result.expiresInSeconds,
        user: result.user,
      },
    });
  } catch (e) { next(e); }
});

// ── POST /api/auth/refresh ────────────────────────────────────────────────
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const oldToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!oldToken) throw ApiError.unauthorized('No refresh token provided');

    const result = await authService.refreshTokens(oldToken);

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({ data: { accessToken: result.accessToken, expiresInSeconds: result.expiresInSeconds } });
  } catch (e) {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
    next(e);
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────
router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization!;
    const token = header.slice('Bearer '.length);
    const decoded = jwt.decode(token) as { jti: string; exp: number };
    const expiresInSeconds = Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));

    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    await authService.logout(decoded.jti, expiresInSeconds, refreshToken);

    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
    res.status(204).send();
  } catch (e) { next(e); }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getMe(req.user.id);
    res.json({ data: user });
  } catch (e) { next(e); }
});

// ── POST /api/auth/change-password ────────────────────────────────────────
router.post('/change-password', authenticate, validate(changePasswordSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.changePassword(req.user.id, req.body);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' }); // this session's cookie is dead too — revokeAllTokens killed it
    res.json({ data: { message: 'Password changed. Please log in again.' } });
  } catch (e) { next(e); }
});

export default router;

// Register in app.ts: app.use('/api/auth', authRouter);
//
// NOTE: requires cookie-parser middleware mounted in app.ts (already is,
// per the app.ts delivered earlier) and CORS configured with
// credentials: true + a specific (non-wildcard) origin, since HttpOnly
// cookies don't work with Access-Control-Allow-Origin: *.