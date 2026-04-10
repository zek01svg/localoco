import { describe, it, expect } from "vitest";

import { user } from "../../../database/schema";
import { defaultUser } from "../../factories";
import { useIntegrationHarness, mockAuthSession } from "../../harness";

describe("File Routes - Integration Tests", () => {
  const harness = useIntegrationHarness();

  async function uploadRequest(fields: Record<string, string | Blob>) {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      form.append(key, value);
    }
    return harness.app.request("/api/files/upload", {
      method: "POST",
      body: form,
    });
  }

  describe("POST /api/files/upload", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await uploadRequest({ bucket: "user-avatars" });
      expect(res.status).toBe(401);
    });

    it("returns error when no file is provided", async () => {
      const u = defaultUser({ id: "file-user-1", email: "file1@example.com" });
      await harness.db.insert(user).values(u);
      mockAuthSession({ user: u });

      const res = await uploadRequest({ bucket: "user-avatars" });
      expect(res.status).toBe(500);
      const data = await res.json();
      // @ts-expect-error - dynamic body
      expect(data.error).toMatch(/No file provided/);
    });

    it("returns error for invalid bucket", async () => {
      const u = defaultUser({ id: "file-user-2", email: "file2@example.com" });
      await harness.db.insert(user).values(u);
      mockAuthSession({ user: u });

      const file = new File([new Uint8Array(100)], "test.png", {
        type: "image/png",
      });
      const res = await uploadRequest({ file, bucket: "not-a-bucket" });
      expect(res.status).toBe(500);
      const data = await res.json();
      // @ts-expect-error - dynamic body
      expect(data.error).toMatch(/Invalid upload bucket/);
    });

    it("returns error for wrong MIME type on user-avatars", async () => {
      const u = defaultUser({ id: "file-user-3", email: "file3@example.com" });
      await harness.db.insert(user).values(u);
      mockAuthSession({ user: u });

      const file = new File([new Uint8Array(100)], "doc.pdf", {
        type: "application/pdf",
      });
      const res = await uploadRequest({ file, bucket: "user-avatars" });
      expect(res.status).toBe(500);
      const data = await res.json();
      // @ts-expect-error - dynamic body
      expect(data.error).toMatch(/JPEG and PNG/);
    });

    it("returns url on successful upload to user-avatars", async () => {
      const u = defaultUser({ id: "file-user-4", email: "file4@example.com" });
      await harness.db.insert(user).values(u);
      mockAuthSession({ user: u });

      const file = new File([new Uint8Array(100)], "avatar.png", {
        type: "image/png",
      });
      const res = await uploadRequest({ file, bucket: "user-avatars" });
      expect(res.status).toBe(200);
      const data = await res.json();
      // @ts-expect-error - dynamic body
      expect(data.url).toBeDefined();
      // @ts-expect-error - dynamic body
      expect(data.bucket).toBe("user-avatars");
    });

    it("returns url on successful upload to business-assets", async () => {
      const u = defaultUser({ id: "file-user-5", email: "file5@example.com" });
      await harness.db.insert(user).values(u);
      mockAuthSession({ user: u });

      const file = new File([new Uint8Array(500)], "flyer.jpg", {
        type: "image/jpeg",
      });
      const res = await uploadRequest({ file, bucket: "business-assets" });
      expect(res.status).toBe(200);
      const data = await res.json();
      // @ts-expect-error - dynamic body
      expect(data.bucket).toBe("business-assets");
    });
  });
});
