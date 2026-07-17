import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { ApiError } from '../lib/errors';

type Target = 'body' | 'query' | 'params';

/**
 * Validates req[target] against a Zod schema and replaces it with the
 * parsed (and coerced/defaulted) result — so downstream code can trust
 * types exactly as the schema defines them, not the raw wire strings.
 *
 * Usage: validate(createClaimSchema) validates req.body (default).
 *        validate(claimQuerySchema, 'query') validates req.query.
 */
export function validate(schema: ZodSchema, target: Target = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const fieldErrors = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || target,
        message: issue.message,
      }));
      return next(new ApiError(400, `Validation failed: ${fieldErrors.map((f) => `${f.field} — ${f.message}`).join('; ')}`));
    }

    // req.query and req.params are getter-only in some Express versions —
    // reassigning req[target] directly can throw. Mutating in place is safer.
    if (target === 'body') {
      req.body = result.data;
    } else {
      Object.assign(req[target], result.data);
    }

    next();
  };
}