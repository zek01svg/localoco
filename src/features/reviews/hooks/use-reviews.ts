import type {
  CreateReview,
  ReviewItem,
  ReviewsResponse,
  UpdateReview,
} from "#shared/contracts/reviews";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { apiUrl } from "#client/lib/api";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import { reviewItemSchema, reviewsResponseSchema } from "#shared/contracts/reviews";

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const json: unknown = await res.json();
    const parsed = errorEnvelopeSchema.safeParse(json);
    return parsed.success ? parsed.data.error.message : fallback;
  } catch {
    return fallback;
  }
}

export function useBusinessReviewsQuery(businessId: string, enabled = true) {
  return useInfiniteQuery<ReviewsResponse>({
    queryKey: ["business-reviews", businessId],
    queryFn: async ({ pageParam }) => {
      const url = new URL(`${apiUrl}/businesses/${encodeURIComponent(businessId)}/reviews`);
      url.searchParams.set("limit", "10");
      if (typeof pageParam === "string" && pageParam) {
        url.searchParams.set("cursor", pageParam);
      }

      const res = await fetch(url.toString(), {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Could not load reviews");
      }

      return reviewsResponseSchema.parse(await res.json());
    },
    initialPageParam: null as string | null,
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
    enabled: Boolean(businessId) && enabled,
  });
}

export function useUserReviewsQuery(userId: string, enabled = true) {
  return useInfiniteQuery<ReviewsResponse>({
    queryKey: ["user-reviews", userId],
    queryFn: async ({ pageParam }) => {
      const url = new URL(`${apiUrl}/users/${encodeURIComponent(userId)}/reviews`);
      url.searchParams.set("limit", "10");
      if (typeof pageParam === "string" && pageParam) {
        url.searchParams.set("cursor", pageParam);
      }

      const res = await fetch(url.toString(), {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Could not load user reviews");
      }

      return reviewsResponseSchema.parse(await res.json());
    },
    initialPageParam: null as string | null,
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
    enabled: Boolean(userId) && enabled,
  });
}

export function useCreateReviewMutation(businessId: string) {
  const queryClient = useQueryClient();

  return useMutation<ReviewItem, Error, CreateReview>({
    mutationFn: async payload => {
      const res = await fetch(`${apiUrl}/businesses/${encodeURIComponent(businessId)}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (res.status === 409) {
        throw new Error("You have already reviewed this business");
      }
      if (!res.ok) {
        const message = await parseErrorMessage(res, "Failed to post review");
        throw new Error(message);
      }

      return reviewItemSchema.parse(await res.json());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["business-reviews", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["user-reviews"] });
    },
  });
}

export function useUpdateReviewMutation(businessId: string) {
  const queryClient = useQueryClient();

  return useMutation<ReviewItem, Error, { reviewId: string; data: UpdateReview }>({
    mutationFn: async ({ reviewId, data }) => {
      const res = await fetch(`${apiUrl}/reviews/${encodeURIComponent(reviewId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const message = await parseErrorMessage(res, "Failed to update review");
        throw new Error(message);
      }

      return reviewItemSchema.parse(await res.json());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["business-reviews", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["user-reviews"] });
    },
  });
}

export function useDeleteReviewMutation(businessId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { reviewId: string }>({
    mutationFn: async ({ reviewId }) => {
      const res = await fetch(`${apiUrl}/reviews/${encodeURIComponent(reviewId)}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const message = await parseErrorMessage(res, "Failed to delete review");
        throw new Error(message);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["business-reviews", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["user-reviews"] });
    },
  });
}
