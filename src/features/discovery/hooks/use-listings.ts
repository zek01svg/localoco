import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { apiUrl } from "#client/lib/api";
import {
  listingsCategoriesResponseSchema,
  listingsResponseSchema,
} from "#shared/contracts/listings";

async function fetchListingsJson(path: string, errorMessage: string): Promise<unknown> {
  const res = await fetch(`${apiUrl}${path}`);
  if (!res.ok) {
    throw new Error(errorMessage);
  }
  return res.json();
}

async function fetchPage(
  q: string,
  category: string,
  openNow: boolean,
  cursor: string | undefined
) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  if (openNow) params.set("openNow", "true");
  if (cursor) params.set("cursor", cursor);
  const query = params.toString();

  return listingsResponseSchema.parse(
    await fetchListingsJson(
      `/listings${query ? `?${query}` : ""}`,
      "Business listings could not be loaded. Try again shortly."
    )
  );
}

export function useListingsInfiniteQuery(q: string, category: string, openNow = false) {
  return useInfiniteQuery({
    queryKey: ["listings", q, category, openNow],
    queryFn: ({ pageParam }) => fetchPage(q, category, openNow, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
    // A failure is a retryable error state, not something to hide behind
    // silent background retries.
    retry: false,
  });
}

export function useListingsCategoriesQuery() {
  return useQuery({
    queryKey: ["listings-categories"],
    queryFn: async () =>
      listingsCategoriesResponseSchema.parse(
        await fetchListingsJson(
          "/listings/categories",
          "Categories could not be loaded. Try again shortly."
        )
      ),
    retry: false,
    staleTime: 60_000,
  });
}
