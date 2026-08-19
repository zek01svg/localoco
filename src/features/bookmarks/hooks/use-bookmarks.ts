import type { BookmarkStatusResponse } from "#shared/contracts/bookmarks";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  bookmarkActionResponseSchema,
  bookmarksResponseSchema,
  bookmarkStatusResponseSchema,
} from "#shared/contracts/bookmarks";

export function useBookmarksQuery(enabled = true) {
  return useInfiniteQuery({
    queryKey: ["bookmarks"],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const url = pageParam
        ? `/api/bookmarks?cursor=${encodeURIComponent(pageParam)}`
        : "/api/bookmarks";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        throw new Error(`Failed to fetch bookmarks: ${res.statusText}`);
      }
      return bookmarksResponseSchema.parse(await res.json());
    },
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled,
  });
}

export function useBookmarkStatusQuery(businessId: string, enabled = true) {
  return useQuery({
    queryKey: ["bookmarks", "status", businessId],
    queryFn: async () => {
      const res = await fetch(`/api/bookmarks/${encodeURIComponent(businessId)}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch bookmark status: ${res.statusText}`);
      }
      return bookmarkStatusResponseSchema.parse(await res.json());
    },
    enabled: Boolean(businessId) && enabled,
  });
}

export function useAddBookmarkMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (businessId: string) => {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ businessId }),
      });
      if (!res.ok) {
        throw new Error(`Failed to add bookmark: ${res.statusText}`);
      }
      return bookmarkActionResponseSchema.parse(await res.json());
    },
    onSuccess: (_data, businessId) => {
      queryClient.setQueryData<BookmarkStatusResponse>(["bookmarks", "status", businessId], {
        bookmarked: true,
        bookmark: _data.bookmark ?? null,
      });
      void queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });
}

export function useRemoveBookmarkMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (businessId: string) => {
      const res = await fetch(`/api/bookmarks/${encodeURIComponent(businessId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Failed to remove bookmark: ${res.statusText}`);
      }
      return bookmarkActionResponseSchema.parse(await res.json());
    },
    onSuccess: (_data, businessId) => {
      queryClient.setQueryData<BookmarkStatusResponse>(["bookmarks", "status", businessId], {
        bookmarked: false,
        bookmark: null,
      });
      void queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });
}
