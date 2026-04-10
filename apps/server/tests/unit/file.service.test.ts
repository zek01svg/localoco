import { describe, it, expect, vi, beforeEach } from "vitest";

import { uploadFile } from "../../routes/file/file.service";

vi.mock("@server/lib/pino", () => ({
  default: { error: vi.fn(), info: vi.fn() },
}));

const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();

vi.mock("@server/lib/supabase", () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      })),
    },
  },
}));

function makeFile(name: string, type: string, sizeBytes: number): File {
  const buf = new Uint8Array(sizeBytes);
  return new File([buf], name, { type });
}

describe("uploadFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: "https://cdn.example.com/test.png" },
    });
  });

  it("returns 400 when file is null", async () => {
    const result = await uploadFile("user-avatars", null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.error).toMatch(/No file provided/);
    }
  });

  it("returns 400 for unknown bucket", async () => {
    const file = makeFile("photo.png", "image/png", 100);
    const result = await uploadFile("unknown-bucket", file);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.error).toMatch(/Invalid upload bucket/);
    }
  });

  describe("user-avatars bucket", () => {
    it("rejects non-image MIME type", async () => {
      const file = makeFile("doc.pdf", "application/pdf", 100);
      const result = await uploadFile("user-avatars", file);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(400);
        expect(result.error).toMatch(/JPEG and PNG/);
      }
    });

    it("rejects files over 1 MB", async () => {
      const file = makeFile("big.jpg", "image/jpeg", 1.1 * 1024 * 1024);
      const result = await uploadFile("user-avatars", file);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(400);
        expect(result.error).toMatch(/1MB/);
      }
    });

    it("accepts JPEG under 1 MB", async () => {
      const file = makeFile("avatar.jpg", "image/jpeg", 500 * 1024);
      const result = await uploadFile("user-avatars", file);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.url).toBe("https://cdn.example.com/test.png");
        expect(result.data.bucket).toBe("user-avatars");
      }
    });

    it("accepts PNG under 1 MB", async () => {
      const file = makeFile("avatar.png", "image/png", 200 * 1024);
      const result = await uploadFile("user-avatars", file);
      expect(result.ok).toBe(true);
    });
  });

  describe("business-assets bucket", () => {
    it("rejects files over 3 MB", async () => {
      const file = makeFile("big.jpg", "image/jpeg", 3.1 * 1024 * 1024);
      const result = await uploadFile("business-assets", file);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(400);
        expect(result.error).toMatch(/3MB/);
      }
    });

    it("accepts any MIME type under 3 MB", async () => {
      const file = makeFile("menu.pdf", "application/pdf", 1 * 1024 * 1024);
      const result = await uploadFile("business-assets", file);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.bucket).toBe("business-assets");
      }
    });
  });

  it("returns 500 when Supabase upload fails", async () => {
    mockUpload.mockResolvedValue({ error: new Error("Storage error") });
    const file = makeFile("avatar.png", "image/png", 100);
    const result = await uploadFile("user-avatars", file);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(500);
      expect(result.error).toMatch(/Upload failed/);
    }
  });

  it("includes the file extension in the storage path", async () => {
    const file = makeFile("my-photo.jpeg", "image/jpeg", 100);
    await uploadFile("user-avatars", file);
    const uploadCall = mockUpload.mock.calls[0];
    const storagePath: string = uploadCall[0];
    expect(storagePath).toMatch(/\.jpeg$/);
  });
});
