import { S3Client } from "bun";

import { env } from "#server/env";

export const s3Client = new S3Client({
  region: env.AWS_REGION,
  endpoint: env.AWS_S3_ENDPOINT,
  bucket: env.AWS_S3_BUCKET,
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  virtualHostedStyle: !env.FORCE_PATH_STYLE,
});
