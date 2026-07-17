import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { env } from '../config/env';

/**
 * Shared S3 client singleton — same pattern as config/prisma.ts and
 * config/redis.ts. Imported by receipt.ts, the prescription attachments
 * router, and anything else that needs to read/write S3, WITHOUT pulling
 * in Express router code (that lives in modules/attachments/attachments.router.ts).
 */
export const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const S3_BUCKET = env.S3_BUCKET_NAME!;

export type S3Category = 'prescription-attachments' | 'receipts' | 'insurance-documents';

export async function uploadToS3(params: {
  buffer: Buffer;
  mimeType: string;
  branchId: string;
  category: S3Category;
}): Promise<string> {
  const ext = params.mimeType.split('/')[1] ?? 'bin';
  const key = `${params.category}/${params.branchId}/${randomUUID()}.${ext}`;

  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: params.buffer,
    ContentType: params.mimeType,
    ServerSideEncryption: 'AES256', // patient documents and receipts are encrypted at rest, not optional
  }));

  return key;
}

export async function getPresignedDownloadUrl(key: string, expiresInSeconds = 300): Promise<string> {
  const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

export async function deleteFromS3(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
}

// ── Required env vars (already in env.ts, confirm they're set in .env) ──
// AWS_REGION=af-south-1
// AWS_ACCESS_KEY_ID=
// AWS_SECRET_ACCESS_KEY=
// S3_BUCKET_NAME=pharmpro-documents-prod
//
// Bucket must have public access fully blocked — every read goes through
// getPresignedDownloadUrl with a short TTL, never a public object URL.