import { describe, expect, it } from "vitest";

import {
  MAX_PHOTO_BYTES,
  photoExtensionMatchesType,
  photoPresignRequestSchema,
  photoPresignResponseSchema,
} from "#shared/contracts/media";

describe("photoExtensionMatchesType", () => {
  it("accepts the extensions mapped to each media type", () => {
    expect(photoExtensionMatchesType("front.jpg", "image/jpeg")).toBe(true);
    expect(photoExtensionMatchesType("front.jpeg", "image/jpeg")).toBe(true);
    expect(photoExtensionMatchesType("front.png", "image/png")).toBe(true);
    expect(photoExtensionMatchesType("front.webp", "image/webp")).toBe(true);
  });

  it("is case-insensitive and ignores the directory part", () => {
    expect(photoExtensionMatchesType("C:\\Photos\\Front.JPG", "image/jpeg")).toBe(true);
    expect(photoExtensionMatchesType("/tmp/front.PnG", "image/png")).toBe(true);
  });

  it("rejects mismatched extensions, missing extensions, and trailing dots", () => {
    expect(photoExtensionMatchesType("front.png", "image/jpeg")).toBe(false);
    expect(photoExtensionMatchesType("front", "image/jpeg")).toBe(false);
    expect(photoExtensionMatchesType("front.", "image/jpeg")).toBe(false);
    expect(photoExtensionMatchesType("front.gif", "image/jpeg")).toBe(false);
  });
});

describe("photoPresignRequestSchema", () => {
  it("accepts a valid request and keeps only the declared fields", () => {
    const parsed = photoPresignRequestSchema.parse({
      contentType: "image/jpeg",
      size: 1024,
      filename: "front.jpg",
      ownerId: "usr_other",
    });

    expect(parsed).toEqual({ contentType: "image/jpeg", size: 1024, filename: "front.jpg" });
  });

  it("accepts the maximum photo size", () => {
    expect(
      photoPresignRequestSchema.parse({
        contentType: "image/png",
        size: MAX_PHOTO_BYTES,
        filename: "big.png",
      })
    ).toEqual({ contentType: "image/png", size: MAX_PHOTO_BYTES, filename: "big.png" });
  });

  it("rejects empty and oversized photos", () => {
    const empty = photoPresignRequestSchema.safeParse({
      contentType: "image/jpeg",
      size: 0,
      filename: "a.jpg",
    });
    expect(empty.success).toBe(false);

    const oversized = photoPresignRequestSchema.safeParse({
      contentType: "image/jpeg",
      size: MAX_PHOTO_BYTES + 1,
      filename: "a.jpg",
    });
    expect(oversized.success).toBe(false);
  });

  it("rejects a filename extension that contradicts the declared media type", () => {
    const result = photoPresignRequestSchema.safeParse({
      contentType: "image/png",
      size: 1024,
      filename: "front.jpg",
    });

    expect(result.success).toBe(false);
  });

  it("rejects unsupported media types and non-integer sizes", () => {
    expect(
      photoPresignRequestSchema.safeParse({
        contentType: "image/gif",
        size: 1024,
        filename: "a.gif",
      }).success
    ).toBe(false);

    expect(
      photoPresignRequestSchema.safeParse({
        contentType: "image/jpeg",
        size: 1024.5,
        filename: "a.jpg",
      }).success
    ).toBe(false);
  });
});

describe("photoPresignResponseSchema", () => {
  it("carries exactly the upload grant: id, signed URL, expiry, and the signed header", () => {
    const parsed = photoPresignResponseSchema.parse({
      id: "med_123",
      uploadUrl: "https://minio.example.com/bucket/listing-photos/biz_1/abc?x-sign=1",
      expiresAt: "2026-08-18T00:15:00.000Z",
      headers: { "content-type": "image/jpeg" },
      key: "listing-photos/biz_1/abc",
    });

    expect(parsed).toEqual({
      id: "med_123",
      uploadUrl: "https://minio.example.com/bucket/listing-photos/biz_1/abc?x-sign=1",
      expiresAt: "2026-08-18T00:15:00.000Z",
      headers: { "content-type": "image/jpeg" },
    });
  });
});
