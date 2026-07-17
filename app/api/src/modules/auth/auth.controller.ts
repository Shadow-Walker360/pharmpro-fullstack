import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { ApiError } from '../../lib/errors';
import * as authService from './auth.service';

export const REFRESH_COOKIE_NAME = 'pharmpro_refresh';

export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/auth',
  maxAge: env.JWT_REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
};

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body, req.ip ?? 'unknown');
      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);
      res.json({
        data: { accessToken: result.accessToken, expiresInSeconds: result.expiresInSeconds, user: result.user },
      });
    } catch (e) { next(e); }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
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
  },

  async logout(req: Request, res: Response, next: NextFunction) {
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
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.getMe(req.user.id);
      res.json({ data: user });
    } catch (e) { next(e); }
  },

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.changePassword(req.user.id, req.body);
      res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
      res.json({ data: { message: 'Password changed. Please log in again.' } });
    } catch (e) { next(e); }
  },
};