import { useQuery } from "@tanstack/react-query";

import { apiUrl } from "#client/lib/api";
import { businessesResponseSchema } from "#shared/contracts/business";

export function useOwnedBusinessesQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["owned-businesses"],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/businesses`);
      if (!res.ok) {
        throw new Error("Your businesses could not be loaded. Try again shortly.");
      }
      return businessesResponseSchema.parse(await res.json());
    },
    enabled,
    retry: false,
  });
}
