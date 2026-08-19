import { S3Client } from "bun";

import { env } from "#server/env";

// The single narrow seam to the S3-compatible object store (R2 in production,
// MinIO in development). ADR-0005: external providers are isolated behind
// narrow modules — route handlers never touch the S3 API surface directly.
// Objects are private by default: every read or write goes through a
// short-lived presigned URL or a server-side call with the service
// credentials; no object is ever publicly readable from the bucket.
const s3Client = new S3Client({
  region: env.AWS_REGION ?? "auto",
  endpoint: env.AWS_S3_ENDPOINT,
  bucket: env.AWS_S3_BUCKET,
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  virtualHostedStyle: !env.FORCE_PATH_STYLE,
});

// Production requires every credential; development runs against MinIO with
// the same variables. An unconfigured store is a dependency failure at the
// boundary, never a silent fallback.
export const mediaStorageConfigured = (): boolean =>
  Boolean(
    env.AWS_S3_BUCKET && env.AWS_S3_ENDPOINT && env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
  );

export const presignUploadUrl = (
  key: string,
  contentType: string,
  expiresInSeconds: number
): string =>
  s3Client.presign(key, { method: "PUT", type: contentType, expiresIn: expiresInSeconds });

export const presignDownloadUrl = (key: string, expiresInSeconds: number): string =>
  s3Client.presign(key, { method: "GET", expiresIn: expiresInSeconds });

export type StoredObjectStats = {
  size: number;
  type: string;
};

export const statObject = async (key: string): Promise<StoredObjectStats | null> => {
  const file = s3Client.file(key);
  if (!(await file.exists())) {
    return null;
  }
  const stats = await file.stat();
  return { size: stats.size, type: stats.type };
};

export const deleteObject = async (key: string): Promise<void> => {
  await s3Client.delete(key);
};
