import type { Request, Response, NextFunction } from 'express';
import { writeAuditLog } from '../lib/audit';

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'DISPENSE' | 'OVERRIDE';

function actionFromMethod(method: string): AuditAction {
  switch (method) {
    case 'POST': return 'CREATE';
    case 'PATCH':
    case 'PUT': return 'UPDATE';
    case 'DELETE': return 'DELETE';
    default: return 'UPDATE';
  }
}

/**
 * Drop-in middleware that writes the audit trail automatically, so
 * individual controllers don't need to remember to call writeAuditLog by
 * hand on every mutation. Mount per-router with the table name it covers:
 *
 *   router.post('/', authorize(...), validate(schema), auditLogger('patient'), handler);
 *
 * How it captures data:
 * - action: inferred from req.method (POST → CREATE, PATCH/PUT → UPDATE, DELETE → DELETE)
 * - recordId: req.params.id if present, otherwise pulled from the
 *   response body's `data.id` after the handler runs (covers CREATE,
 *   where the ID doesn't exist until the handler creates it)
 * - newValue: the response body's `data` field
 * - oldValue: read from res.locals.oldValue — the handler must set this
 *   BEFORE calling next()/res.json() if it wants a before/after diff
 *   captured (e.g. for UPDATE/DELETE). Optional — omitted for CREATE.
 *
 * Runs AFTER the route handler (hooks res.json), and only writes the
 * audit entry if the response was successful (status < 400) — a failed
 * mutation shouldn't produce a misleading "CREATE succeeded" audit row.
 *
 * For actions that don't fit the generic CRUD mapping (DISPENSE,
 * OVERRIDE), don't use this middleware — call writeAuditLog directly
 * from the service, as prescriptions.service.ts already does, since
 * those need richer context than a generic HTTP-method mapping can infer.
 */
export function auditLogger(tableName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    let capturedBody: any;

    res.json = (body: any) => {
      capturedBody = body;
      return originalJson(body);
    };

    res.on('finish', () => {
      if (res.statusCode >= 400) return; // failed request — nothing to audit
      if (!req.user) return; // shouldn't happen behind `authenticate`, but never crash the response over it

      const recordId = req.params.id ?? capturedBody?.data?.id;
      if (!recordId) return; // nothing identifiable to attach the entry to

      void writeAuditLog({
        userId: req.user.id,
        branchId: req.branchId,
        action: actionFromMethod(req.method),
        tableName,
        recordId,
        oldValue: res.locals.oldValue,
        newValue: capturedBody?.data,
        ipAddress: req.ip ?? 'unknown',
      });
    });

    next();
  };
}