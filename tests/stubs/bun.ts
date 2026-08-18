// Vitest cannot resolve Bun's built-in "bun" module in its node runtime, so
// vitest.config.ts aliases "bun" to this stub. The real server never runs
// through vite, so production behavior is untouched; tests either mock
// #server/lib/media-storage outright or never call storage methods (the
// routes answer 503 before touching the client when storage is unconfigured).
export class S3Client {
  presign(): string {
    throw new Error("bun S3Client stub: presign is never expected to run in tests");
  }
  file(): unknown {
    throw new Error("bun S3Client stub: file is never expected to run in tests");
  }
  delete(): void {
    throw new Error("bun S3Client stub: delete is never expected to run in tests");
  }
}
