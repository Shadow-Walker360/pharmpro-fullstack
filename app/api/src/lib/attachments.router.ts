import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { prisma } from '../config/prisma';
import { authenticate } from '../middleware/authenticate';
import { branchGuard } from '../middleware/branchGuard';
import { authorize } from '../middleware/authorize';
import { writeAuditLog } from './audit';
import { ApiError } from './errors';
import { uploadToS3, getPresignedDownloadUrl, deleteFromS3 } from './s3';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB — prescription scans, not video

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new ApiError(400, `Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, HEIC, PDF.`) as any);
    }
    cb(null, true);
  },
});

// Mounted as: app.use('/api/prescriptions/:prescriptionId/attachments', attachmentRouter)
const router = Router({ mergeParams: true });
router.use(authenticate, branchGuard);

router.post(
  '/',
  authorize('SUPER_ADMIN', 'PHARMACIST', 'TECHNICIAN'),
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new ApiError(400, 'No file uploaded');

      const prescription = await prisma.prescription.findFirst({
        where: { id: req.params.prescriptionId, branchId: req.branchId },
      });
      if (!prescription) throw new ApiError(404, 'Prescription not found');

      const key = await uploadToS3({
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        branchId: req.branchId,
        category: 'prescription-attachments',
      });

      const attachment = await prisma.prescriptionAttachment.create({
        data: {
          prescriptionId: prescription.id,
          s3Key: key,
          mimeType: req.file.mimetype,
          fileSizeBytes: req.file.size,
          uploadedById: req.user.id,
          originalFilename: req.file.originalname,
        },
      });

      await writeAuditLog({
        userId: req.user.id, branchId: req.branchId, action: 'CREATE',
        tableName: 'prescription_attachment', recordId: attachment.id,
        newValue: { prescriptionId: prescription.id, mimeType: req.file.mimetype, fileSizeBytes: req.file.size },
        ipAddress: req.ip ?? 'unknown',
      });

      res.status(201).json({ data: { id: attachment.id, mimeType: attachment.mimeType, createdAt: attachment.createdAt } });
    } catch (e) { next(e); }
  },
);

router.get(
  '/',
  authorize('SUPER_ADMIN', 'PHARMACIST', 'TECHNICIAN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const attachments = await prisma.prescriptionAttachment.findMany({
        where: { prescriptionId: req.params.prescriptionId },
        select: { id: true, mimeType: true, originalFilename: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ data: attachments });
    } catch (e) { next(e); }
  },
);

router.get(
  '/:attachmentId/download-url',
  authorize('SUPER_ADMIN', 'PHARMACIST', 'TECHNICIAN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const attachment = await prisma.prescriptionAttachment.findFirst({
        where: { id: req.params.attachmentId, prescriptionId: req.params.prescriptionId },
      });
      if (!attachment) throw new ApiError(404, 'Attachment not found');

      // Every download of a patient document is a read event — same
      // principle as ReadAuditLog on patient profile views.
      await writeAuditLog({
        userId: req.user.id, branchId: req.branchId, action: 'UPDATE',
        tableName: 'prescription_attachment_access', recordId: attachment.id,
        ipAddress: req.ip ?? 'unknown',
      });

      const url = await getPresignedDownloadUrl(attachment.s3Key, 300); // 5-minute link, not a permanent URL
      res.json({ url, expiresIn: 300 });
    } catch (e) { next(e); }
  },
);

router.delete(
  '/:attachmentId',
  authorize('SUPER_ADMIN', 'PHARMACIST'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const attachment = await prisma.prescriptionAttachment.findFirst({
        where: { id: req.params.attachmentId, prescriptionId: req.params.prescriptionId },
      });
      if (!attachment) throw new ApiError(404, 'Attachment not found');

      await deleteFromS3(attachment.s3Key);
      await prisma.prescriptionAttachment.delete({ where: { id: attachment.id } });

      await writeAuditLog({
        userId: req.user.id, branchId: req.branchId, action: 'DELETE',
        tableName: 'prescription_attachment', recordId: attachment.id,
        ipAddress: req.ip ?? 'unknown',
      });

      res.status(204).send();
    } catch (e) { next(e); }
  },
);

export default router;

// Register in app.ts:
//   import attachmentRouter from './lib/attachments.router';
//   app.use('/api/prescriptions/:prescriptionId/attachments', attachmentRouter);
//
// Dependencies: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner multer