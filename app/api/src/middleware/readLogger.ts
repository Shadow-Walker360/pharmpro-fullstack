import type { Request, Response, NextFunction } from 'express';
import { writeReadAuditLog } from '../lib/audit';

/**
 * Drop-in middleware that logs every read of a patient record — the
 * single most important entry in the whole audit system per the doctor's
 * review: privacy breaches in healthcare are usually reads, not writes.
 *
 * Mount on any GET route that returns patient data, telling it how to
 * find the patientId being viewed:
 *
 *   // Direct patient profile view — id IS the patientId
 *   router.get('/:id', authorize(...), readLogger(), handler);
 *
 *   // A route where the patient isn't the URL param (e.g. viewing a
 *   // prescription, which has its own :id but belongs to a patient) —
 *   // provide a resolver that reads it off the response body instead
 *   router.get('/:id', authorize(...), readLogger((req, body) => body?.data?.patientId), handler);
 *
 * Runs AFTER the handler (hooks res.json) and only logs on success —
 * a 404 or 403 means nothing was actually viewed, so nothing is logged.
 */
type PatientIdResolver = (req: Request, responseBody: any) => string | null | undefined;

const defaultResolver: PatientIdResolver = (req) => req.params.id;

export function readLogger(resolvePatientId: PatientIdResolver = defaultResolver) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    let capturedBody: any;

    res.json = (body: any) => {
      capturedBody = body;
      return originalJson(body);
    };

    res.on('finish', () => {
      if (res.statusCode >= 400) return;
      if (!req.user) return;

      const patientId = resolvePatientId(req, capturedBody);
      if (!patientId) return; // nothing patient-identifiable was actually returned

      void writeReadAuditLog({
        userId: req.user.id,
        branchId: req.branchId,
        patientId,
        ipAddress: req.ip ?? 'unknown',
        device: req.headers['user-agent'] ?? null,
      });
    });

    next();
  };
}

/**
 * For list endpoints that return MULTIPLE patients at once (e.g. a search
 * results page) — logging one row per patient in the list, since each one
 * was still "viewed" by the staff member even in summary form.
 *
 *   router.get('/', authorize(...), readLoggerForList((body) => body?.data?.map(p => p.id)), handler);
 */
export function readLoggerForList(resolvePatientIds: (responseBody: any) => (string | null | undefined)[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    let capturedBody: any;

    res.json = (body: any) => {
      capturedBody = body;
      return originalJson(body);
    };

    res.on('finish', () => {
      if (res.statusCode >= 400) return;
      if (!req.user) return;

      const patientIds = (resolvePatientIds(capturedBody) ?? []).filter((id): id is string => !!id);
      for (const patientId of patientIds) {
        void writeReadAuditLog({
          userId: req.user.id,
          branchId: req.branchId,
          patientId,
          ipAddress: req.ip ?? 'unknown',
          device: req.headers['user-agent'] ?? null,
        });
      }
    });

    next();
  };
}