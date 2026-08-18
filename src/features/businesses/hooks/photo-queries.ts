import type { MediaObject } from "#shared/contracts/media";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiUrl } from "#client/lib/api";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import {
  mediaListResponseSchema,
  mediaObjectSchema,
  photoPresignResponseSchema,
} from "#shared/contracts/media";

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const envelope = errorEnvelopeSchema.safeParse(await res.json().catch(() => {}));
  return envelope.success ? envelope.data.error.message : fallback;
}

export function useListingPhotosQuery(businessId: string) {
  return useQuery({
    queryKey: ["listing-photos", businessId],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/businesses/${businessId}/photos`);
      if (!res.ok) {
        throw new Error("Your photos could not be loaded. Try again shortly.");
      }
      return mediaListResponseSchema.parse(await res.json());
    },
  });
}

// One mutation covers the whole upload: presign, PUT to storage, complete.
// The client never holds storage credentials; it only follows the grants.
export function useUploadListingPhotoMutation(businessId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File): Promise<MediaObject> => {
      const presign = await fetch(`${apiUrl}/businesses/${businessId}/photos`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contentType: file.type,
          size: file.size,
          filename: file.name,
        }),
      });
      if (!presign.ok) {
        throw new Error(
          await errorMessage(presign, "This photo could not be uploaded. Try again shortly.")
        );
      }
      const grant = photoPresignResponseSchema.parse(await presign.json());

      const put = await fetch(grant.uploadUrl, {
        method: "PUT",
        headers: { "content-type": grant.headers["content-type"] },
        body: file,
      });
      if (!put.ok) {
        throw new Error("The upload could not reach storage. Try again.");
      }

      const complete = await fetch(`${apiUrl}/media/${grant.id}/complete`, { method: "POST" });
      if (!complete.ok) {
        throw new Error(
          await errorMessage(complete, "This photo could not be verified. Try again shortly.")
        );
      }
      return mediaObjectSchema.parse(await complete.json());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["listing-photos", businessId] });
    },
  });
}

export function useDeleteListingPhotoMutation(businessId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mediaId: string) => {
      const res = await fetch(`${apiUrl}/media/${mediaId}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error(
          await errorMessage(res, "This photo could not be deleted. Try again shortly.")
        );
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["listing-photos", businessId] });
    },
  });
}
