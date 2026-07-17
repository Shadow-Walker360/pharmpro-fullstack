import type { Request, Response, NextFunction } from 'express';

export type Role =
  | 'SUPER_ADMIN'
  | 'PHARMACIST'
  | 'TECHNICIAN'
  | 'CASHIER'
  | 'INVENTORY_MANAGER'
  | 'ACCOUNTANT'
  | 'DELIVERY';

/**
 * Route-level RBAC gate. Usage: authorize('SUPER_ADMIN', 'PHARMACIST')
 * as a middleware after `authenticate` (req.user must already be set).
 *
 * Deliberately simple and explicit — no wildcard "admin implies everything"
 * logic. Every route lists exactly which roles can reach it, so the RBAC
 * matrix is readable straight from the router files rather than requiring
 * you to trace a role hierarchy to know who can do what.
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Authentication required before authorization can be checked' });
    }
    if (!allowedRoles.includes(req.user.role as Role)) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: `Role '${req.user.role}' is not permitted to access this resource. Allowed: ${allowedRoles.join(', ')}`,
      });
    }
    next();
  };
}