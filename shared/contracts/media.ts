import { z } from "zod/v4";

// Shared upload bounds: the client disables the picker at the count limit and
// the server enforces both limits at the boundary. Bounds mirror each other
// exactly — the client uses these constants, the server enforces them.
export const MAX_PHOTOS_PER_BUSINESS = 10;
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type PhotoType = (typeof PHOTO_TYPES)[number];

// Extension must match the declared media type: a JPEG content type with a
// .png filename is malformed input, not a silently coerced upload.
const PHOTO_EXTENSIONS: Record<PhotoType, readonly string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
};

export const photoExtensionMatchesType = (filename: string, contentType: PhotoType): boolean => {
  const ext = filename.includes(".") ? filename.split(".").pop()?.toLowerCase() : "";
  return !!ext && PHOTO_EXTENSIONS[contentType].includes(ext);
};

export const photoPresignRequestSchema = z
  .object({
    contentType: z.enum(PHOTO_TYPES),
    // Exact byte size of the file the client will PUT. Verified against the
    // stored object at complete time; a mismatch rejects the upload.
    size: z
      .number()
      .int()
      .min(1, "A photo must not be empty")
      .max(MAX_PHOTO_BYTES, `A photo must not exceed ${MAX_PHOTO_BYTES} bytes`),
    // The client's original filename; only its extension is used, to cross-check
    // the declared media type. The stored object key is never derived from it.
    filename: z.string().trim().min(1).max(255),
  })
  .refine(value => photoExtensionMatchesType(value.filename, value.contentType), {
    message: "The filename extension does not match the declared media type",
    path: ["filename"],
  });

// The presigned PUT grant. The client uploads directly to the storage provider
// without holding any storage credentials; the key is never returned.
export const photoPresignResponseSchema = z.object({
  id: z.string().min(1),
  uploadUrl: z.url(),
  expiresAt: z.iso.datetime(),
  // The only header the client must send with the PUT; it is the header the
  // server signed, so any other Content-Type makes the signature invalid.
  headers: z.object({
    "content-type": z.string().min(1),
  }),
});

// A stored media object as its owner sees it. `size` is the verified actual
// size for active objects; for pending ones it is the declared size.
export const mediaObjectSchema = z.object({
  id: z.string().min(1),
  businessId: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().nonnegative(),
  status: z.enum(["pending", "active"]),
  createdAt: z.coerce.date(),
});
export type MediaObject = z.infer<typeof mediaObjectSchema>;

export const mediaListResponseSchema = z.object({
  items: z.array(mediaObjectSchema),
});
