import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPresign, mockFile, mockDelete, mockFileExists, mockFileStat, mockEnv } = vi.hoisted(
  () => ({
    mockPresign: vi.fn<(key: string, options: Record<string, unknown>) => string>(),
    mockFile: vi.fn<(key: string) => void>(),
    mockDelete: vi.fn<(key: string) => Promise<void>>(),
    mockFileExists: vi.fn<() => Promise<boolean>>(),
    mockFileStat: vi.fn<() => Promise<{ size: number; type: string }>>(),
    mockEnv: {
      AWS_REGION: "auto",
      AWS_S3_ENDPOINT: "https://s3.example.com",
      AWS_S3_BUCKET: "my-bucket",
      AWS_ACCESS_KEY_ID: "key_123",
      AWS_SECRET_ACCESS_KEY: "secret_123",
      FORCE_PATH_STYLE: false,
    },
  })
);

vi.mock("#server/env", () => ({
  env: mockEnv,
}));

vi.mock("bun", () => ({
  S3Client: class MockS3Client {
    presign = mockPresign;
    file = (key: string) => {
      mockFile(key);
      return {
        exists: mockFileExists,
        stat: mockFileStat,
      };
    };
    delete = mockDelete;
  },
}));

const { mediaStorageConfigured, presignUploadUrl, presignDownloadUrl, statObject, deleteObject } =
  await import("#server/lib/media-storage");

beforeEach(() => {
  vi.clearAllMocks();
  mockEnv.AWS_S3_BUCKET = "my-bucket";
  mockEnv.AWS_S3_ENDPOINT = "https://s3.example.com";
  mockEnv.AWS_ACCESS_KEY_ID = "key_123";
  mockEnv.AWS_SECRET_ACCESS_KEY = "secret_123";
});

describe("mediaStorageConfigured", () => {
  it("returns true when all required credentials and endpoint variables are present", () => {
    expect(mediaStorageConfigured()).toBe(true);
  });

  it("returns false when AWS_S3_BUCKET is missing or empty", () => {
    mockEnv.AWS_S3_BUCKET = "";
    expect(mediaStorageConfigured()).toBe(false);
  });

  it("returns false when AWS_S3_ENDPOINT is missing or empty", () => {
    mockEnv.AWS_S3_ENDPOINT = "";
    expect(mediaStorageConfigured()).toBe(false);
  });

  it("returns false when AWS_ACCESS_KEY_ID is missing or empty", () => {
    mockEnv.AWS_ACCESS_KEY_ID = "";
    expect(mediaStorageConfigured()).toBe(false);
  });

  it("returns false when AWS_SECRET_ACCESS_KEY is missing or empty", () => {
    mockEnv.AWS_SECRET_ACCESS_KEY = "";
    expect(mediaStorageConfigured()).toBe(false);
  });
});

describe("presignUploadUrl", () => {
  it("delegates to s3Client.presign with PUT method, content-type, and expiration seconds", () => {
    mockPresign.mockReturnValueOnce("https://s3.example.com/my-bucket/photo.jpg?sig=upload");

    const url = presignUploadUrl("listing-photos/biz_1/photo.jpg", "image/jpeg", 900);

    expect(url).toBe("https://s3.example.com/my-bucket/photo.jpg?sig=upload");
    expect(mockPresign).toHaveBeenCalledWith("listing-photos/biz_1/photo.jpg", {
      method: "PUT",
      type: "image/jpeg",
      expiresIn: 900,
    });
  });
});

describe("presignDownloadUrl", () => {
  it("delegates to s3Client.presign with GET method and expiration seconds", () => {
    mockPresign.mockReturnValueOnce("https://s3.example.com/my-bucket/photo.jpg?sig=download");

    const url = presignDownloadUrl("listing-photos/biz_1/photo.jpg", 300);

    expect(url).toBe("https://s3.example.com/my-bucket/photo.jpg?sig=download");
    expect(mockPresign).toHaveBeenCalledWith("listing-photos/biz_1/photo.jpg", {
      method: "GET",
      expiresIn: 300,
    });
  });
});

describe("statObject", () => {
  it("returns file stats (size and type) when the object exists in storage", async () => {
    mockFileExists.mockResolvedValueOnce(true);
    mockFileStat.mockResolvedValueOnce({ size: 1048576, type: "image/png" });

    const result = await statObject("listing-photos/biz_1/image.png");

    expect(result).toEqual({ size: 1048576, type: "image/png" });
    expect(mockFile).toHaveBeenCalledWith("listing-photos/biz_1/image.png");
    expect(mockFileExists).toHaveBeenCalledTimes(1);
    expect(mockFileStat).toHaveBeenCalledTimes(1);
  });

  it("returns null when the object does not exist in storage", async () => {
    mockFileExists.mockResolvedValueOnce(false);

    const result = await statObject("listing-photos/biz_1/missing.png");

    expect(result).toBeNull();
    expect(mockFile).toHaveBeenCalledWith("listing-photos/biz_1/missing.png");
    expect(mockFileExists).toHaveBeenCalledTimes(1);
    expect(mockFileStat).not.toHaveBeenCalled();
  });
});

describe("deleteObject", () => {
  it("delegates object deletion to s3Client.delete with the object key", async () => {
    mockDelete.mockReturnValueOnce(Promise.resolve());

    await deleteObject("listing-photos/biz_1/old_photo.jpg");

    expect(mockDelete).toHaveBeenCalledWith("listing-photos/biz_1/old_photo.jpg");
  });
});
