import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { branchGuard } from '../../middleware/branchGuard';
import { validate } from '../../middleware/validate';
import { readLogger, readLoggerForList } from '../../middleware/readLogger';
import { auditLogger } from '../../middleware/auditLogger';
import {
  createPatientSchema, updatePatientSchema, addAllergySchema, patientQuerySchema,
} from './patients.schema';
import * as patientsService from './patients.service';

const router = Router();
router.use(authenticate, branchGuard);

// List — every patient in the results counts as viewed, even in summary form.
router.get(
  '/',
  authorize('SUPER_ADMIN', 'PHARMACIST', 'TECHNICIAN', 'CASHIER'),
  validate(patientQuerySchema, 'query'),
  readLoggerForList((body) => body?.data?.map((p: { id: string }) => p.id)),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await patientsService.listPatients(req.branchId, req.query as any);
      res.json(result);
    } catch (e) { next(e); }
  },
);

router.get(
  '/overdue-refills',
  authorize('SUPER_ADMIN', 'PHARMACIST', 'TECHNICIAN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await patientsService.getPatientsWithOverdueRefills(req.branchId);
      res.json({ data });
    } catch (e) { next(e); }
  },
);

// Single patient — the core privacy-sensitive view, logged every time.
router.get(
  '/:id',
  authorize('SUPER_ADMIN', 'PHARMACIST', 'TECHNICIAN', 'CASHIER'),
  readLogger(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patient = await patientsService.getPatientOrThrow(req.params.id, req.branchId);
      res.json({ data: patient });
    } catch (e) { next(e); }
  },
);

router.post(
  '/',
  authorize('SUPER_ADMIN', 'PHARMACIST', 'TECHNICIAN', 'CASHIER'),
  validate(createPatientSchema),
  auditLogger('patient'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patient = await patientsService.createPatient(req.branchId, req.user.id, req.ip ?? 'unknown', req.body);
      res.status(201).json({ data: patient });
    } catch (e) { next(e); }
  },
);

router.patch(
  '/:id',
  authorize('SUPER_ADMIN', 'PHARMACIST', 'TECHNICIAN'),
  validate(updatePatientSchema),
  auditLogger('patient'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patient = await patientsService.updatePatient(req.params.id, req.branchId, req.user.id, req.ip ?? 'unknown', req.body);
      res.json({ data: patient });
    } catch (e) { next(e); }
  },
);

router.post(
  '/:id/allergies',
  authorize('SUPER_ADMIN', 'PHARMACIST', 'TECHNICIAN'),
  validate(addAllergySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const allergy = await patientsService.addAllergy(req.params.id, req.branchId, req.user.id, req.ip ?? 'unknown', req.body);
      res.status(201).json({ data: allergy });
    } catch (e) { next(e); }
  },
);

router.delete(
  '/:id',
  authorize('SUPER_ADMIN', 'PHARMACIST'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await patientsService.deletePatient(req.params.id, req.branchId, req.user.id, req.ip ?? 'unknown');
      res.status(204).send();
    } catch (e) { next(e); }
  },
);

export default router;

// Register in app.ts: app.use('/api/patients', patientsRouter);