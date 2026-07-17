import { prisma } from '../config/prisma';
import { logger } from './logger';

interface WriteAuditParams {
  userId: string;
  branchId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'DISPENSE' | 'OVERRIDE' | 'LOGIN' | 'LOGOUT';
  tableName: string;
  recordId: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress: string;
}

interface ReadAuditParams {
  userId: string;
  branchId: string;
  patientId: string;
  ipAddress: string;
  device?: string | null;
}

/**
 * Writes to the immutable write-audit trail. This never throws upward —
 * a failed audit write must never block or roll back the actual business
 * transaction it's describing. It logs the failure loudly instead, since
 * a silently-missing audit row is its own kind of compliance problem.
 */
export async function writeAuditLog(params: WriteAuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        branchId: params.branchId,
        action: params.action,
        tableName: params.tableName,
        recordId: params.recordId,
        oldValue: params.oldValue as any,
        newValue: params.newValue as any,
        ipAddress: params.ipAddress,
      },
    });
  } catch (err) {
    logger.error({ err, params }, 'Failed to write audit log — investigate immediately, this is a compliance gap');
  }
}

/**
 * Writes to the read-audit trail — every view of a patient record. Same
 * fire-and-forget-but-loud failure policy as writeAuditLog.
 */
export async function writeReadAuditLog(params: ReadAuditParams): Promise<void> {
  try {
    await prisma.readAuditLog.create({
      data: {
        userId: params.userId,
        branchId: params.branchId,
        patientId: params.patientId,
        ipAddress: params.ipAddress,
        device: params.device ?? null,
      },
    });
  } catch (err) {
    logger.error({ err, params }, 'Failed to write read-audit log — investigate immediately, this is a compliance gap');
  }
}