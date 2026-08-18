import type { BusinessCreate } from "#shared/contracts/business";
import type { OwnerListingUpdate } from "#shared/contracts/listings";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiUrl } from "#client/lib/api";
import { businessCreationResponseSchema } from "#shared/contracts/business";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import { ownerListingSchema } from "#shared/contracts/listings";

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const envelope = errorEnvelopeSchema.safeParse(await res.json().catch(() => {}));
  return envelope.success ? envelope.data.error.message : fallback;
}

export function useCreateBusinessMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: BusinessCreate) => {
      const res = await fetch(`${apiUrl}/businesses`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        throw new Error(
          await errorMessage(res, "Your business could not be created. Try again shortly.")
        );
      }
      return businessCreationResponseSchema.parse(await res.json());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["owned-businesses"] });
    },
  });
}

// 404 is the not-found state of the page; every other failure is an error.
export class ListingNotFoundError extends Error {}

export function useOwnedListingQuery(businessId: string, enabled = true) {
  return useQuery({
    queryKey: ["owned-listing", businessId],
    enabled,
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/businesses/${businessId}/listing`);
      if (res.status === 404) {
        throw new ListingNotFoundError("This listing does not exist or is not yours.");
      }
      if (!res.ok) {
        throw new Error("Your listing could not be loaded. Try again shortly.");
      }
      return ownerListingSchema.parse(await res.json());
    },
    retry: false,
  });
}

export function useUpdateListingMutation(businessId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: OwnerListingUpdate) => {
      const res = await fetch(`${apiUrl}/businesses/${businessId}/listing`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        throw new Error(
          await errorMessage(res, "Your listing could not be updated. Try again shortly.")
        );
      }
      return ownerListingSchema.parse(await res.json());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["owned-listing", businessId] });
    },
  });
}
