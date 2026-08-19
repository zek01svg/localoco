import type { LikeActionResponse } from "#shared/contracts/likes";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiUrl } from "#client/lib/api";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import { likeActionResponseSchema } from "#shared/contracts/likes";

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const json: unknown = await res.json();
    const parsed = errorEnvelopeSchema.safeParse(json);
    return parsed.success ? parsed.data.error.message : fallback;
  } catch {
    return fallback;
  }
}

export function useToggleReviewLikeMutation(businessId?: string) {
  const queryClient = useQueryClient();

  return useMutation<LikeActionResponse, Error, { reviewId: string; isLiked: boolean }>({
    mutationFn: async ({ reviewId, isLiked }) => {
      const url = `${apiUrl}/reviews/${encodeURIComponent(reviewId)}/like`;
      const res = await fetch(url, {
        method: isLiked ? "DELETE" : "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const msg = await parseErrorMessage(
          res,
          isLiked ? "Failed to unlike review" : "Failed to like review"
        );
        throw new Error(msg);
      }

      return likeActionResponseSchema.parse(await res.json());
    },
    onSuccess: () => {
      if (businessId) {
        void queryClient.invalidateQueries({ queryKey: ["business-reviews", businessId] });
      }
      void queryClient.invalidateQueries({ queryKey: ["user-reviews"] });
    },
  });
}

export function useToggleForumPostLikeMutation(postId: string) {
  const queryClient = useQueryClient();

  return useMutation<LikeActionResponse, Error, { isLiked: boolean }>({
    mutationFn: async ({ isLiked }) => {
      const url = `${apiUrl}/forum/posts/${encodeURIComponent(postId)}/like`;
      const res = await fetch(url, {
        method: isLiked ? "DELETE" : "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const msg = await parseErrorMessage(
          res,
          isLiked ? "Failed to unlike post" : "Failed to like post"
        );
        throw new Error(msg);
      }

      return likeActionResponseSchema.parse(await res.json());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["forum-feed"] });
      void queryClient.invalidateQueries({ queryKey: ["forum-post", postId] });
    },
  });
}

export function useToggleForumReplyLikeMutation(postId: string) {
  const queryClient = useQueryClient();

  return useMutation<LikeActionResponse, Error, { replyId: string; isLiked: boolean }>({
    mutationFn: async ({ replyId, isLiked }) => {
      const url = `${apiUrl}/forum/replies/${encodeURIComponent(replyId)}/like`;
      const res = await fetch(url, {
        method: isLiked ? "DELETE" : "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const msg = await parseErrorMessage(
          res,
          isLiked ? "Failed to unlike reply" : "Failed to like reply"
        );
        throw new Error(msg);
      }

      return likeActionResponseSchema.parse(await res.json());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["forum-replies", postId] });
      void queryClient.invalidateQueries({ queryKey: ["forum-post", postId] });
    },
  });
}
