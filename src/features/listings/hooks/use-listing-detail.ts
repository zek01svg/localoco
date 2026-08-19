import type { PublicListingDetail } from "#shared/contracts/listings";

import { useQuery } from "@tanstack/react-query";
import { z } from "zod/v4";

import { apiUrl } from "#client/lib/api";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import { publicListingDetailSchema } from "#shared/contracts/listings";

export class ListingNotFoundError extends Error {
  constructor(message = "Listing not found") {
    super(message);
    this.name = "ListingNotFoundError";
  }
}

export function useListingDetailQuery(listingId: string, enabled = true) {
  return useQuery<PublicListingDetail>({
    queryKey: ["listings", "detail", listingId],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/listings/${encodeURIComponent(listingId)}`);
      if (res.status === 404) {
        throw new ListingNotFoundError();
      }
      const rawJson: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const errorSchema = errorEnvelopeSchema.or(
          z.object({ error: z.object({ message: z.string() }) })
        );
        const parsed = errorSchema.safeParse(rawJson);
        throw new Error(
          parsed.success ? parsed.data.error.message : "Failed to load listing details"
        );
      }
      return publicListingDetailSchema.parse(rawJson);
    },
    enabled: Boolean(listingId) && enabled,
    retry: false,
    staleTime: 30_000,
  });
}
