import logger from "@server/lib/pino";
import { supabase } from "@server/lib/supabase";

type UploadOutcome =
  | { ok: true; data: { url: string; path: string; bucket: string } }
  | { ok: false; status: number; error: string };

const uploadFileToBucket = async (
  bucket: string,
  path: string,
  file: Buffer | ArrayBuffer | string | Blob,
  options: { contentType?: string; upsert?: boolean } = {}
): Promise<string | null> => {
  const uploadOptions: { contentType?: string; upsert?: boolean } = {
    upsert: options.upsert ?? false,
  };

  if (options.contentType) {
    uploadOptions.contentType = options.contentType;
  }

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, uploadOptions);

  if (error) {
    logger.error(error, `Supabase Storage upload error: ${bucket}/${path}`);
    return null;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

export async function uploadFile(
  bucket: string,
  file: File | null
): Promise<UploadOutcome> {
  const ALLOWED_BUCKETS = new Set(["user-avatars", "business-assets"]);

  if (!file) {
    return { ok: false, status: 400, error: "No file provided" };
  }

  if (!ALLOWED_BUCKETS.has(bucket)) {
    return { ok: false, status: 400, error: "Invalid upload bucket" };
  }

  if (bucket === "user-avatars") {
    const allowedTypes = ["image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      return {
        ok: false,
        status: 400,
        error: "Invalid file type. Only JPEG and PNG are allowed for avatars.",
      };
    }
    if (file.size > 1 * 1024 * 1024) {
      return {
        ok: false,
        status: 400,
        error: "File too large. Avatars must be under 1MB.",
      };
    }
  } else if (bucket === "business-assets") {
    if (file.size > 3 * 1024 * 1024) {
      return {
        ok: false,
        status: 400,
        error: "File too large. Business assets must be under 3MB.",
      };
    }
  }

  const extension = file.name.split(".").pop() || "bin";
  const path = `${crypto.randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const publicUrl = await uploadFileToBucket(bucket, path, buffer, {
    contentType: file.type || "application/octet-stream",
  });

  if (!publicUrl) {
    return { ok: false, status: 500, error: "Upload failed" };
  }

  return {
    ok: true,
    data: {
      url: publicUrl,
      path,
      bucket,
    },
  };
}
