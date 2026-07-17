import pino from 'pino';
import { env } from '../config/env';

/**
 * Structured logging from day one. Redaction paths cover the fields most
 * likely to leak into logs by accident — passwords, tokens, M-Pesa
 * credentials, and full card/insurance numbers.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'password',
      'passwordHash',
      '*.password',
      '*.passwordHash',
      'accessToken',
      'refreshToken',
      '*.accessToken',
      '*.refreshToken',
      'mpesaConsumerSecret',
      'mpesaPasskey',
      'policyNumber',
      '*.policyNumber',
    ],
    censor: '[REDACTED]',
  },
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
      : undefined,
});