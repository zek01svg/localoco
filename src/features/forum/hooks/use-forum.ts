import type {
  CreateForumPost,
  CreateForumReply,
  ForumFeedResponse,
  ForumPostItem,
  ForumRepliesResponse,
  ForumReplyItem,
  ModerateForumContent,
  UpdateForumPost,
  UpdateForumReply,
} from "#shared/contracts/forum";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiUrl } from "#client/lib/api";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import {
  forumFeedResponseSchema,
  forumPostItemSchema,
  forumRepliesResponseSchema,
  forumReplyItemSchema,
} from "#shared/contracts/forum";

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const json: unknown = await res.json();
    const parsed = errorEnvelopeSchema.safeParse(json);
    return parsed.success ? parsed.data.error.message : fallback;
  } catch {
    return fallback;
  }
}

export class ForumPostNotFoundError extends Error {
  constructor() {
    super("This discussion is no longer available.");
    this.name = "ForumPostNotFoundError";
  }
}

export function useForumFeedQuery() {
  return useInfiniteQuery<ForumFeedResponse>({
    queryKey: ["forum-feed"],
    queryFn: async ({ pageParam }) => {
      const url = new URL(`${apiUrl}/forum/posts`);
      url.searchParams.set("limit", "10");
      if (typeof pageParam === "string" && pageParam) {
        url.searchParams.set("cursor", pageParam);
      }

      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) {
        throw new Error("Could not load discussions");
      }
      return forumFeedResponseSchema.parse(await res.json());
    },
    initialPageParam: null as string | null,
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
  });
}

export function useForumPostQuery(postId: string) {
  return useQuery<ForumPostItem>({
    queryKey: ["forum-post", postId],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/forum/posts/${encodeURIComponent(postId)}`, {
        credentials: "include",
      });
      if (res.status === 404) {
        throw new ForumPostNotFoundError();
      }
      if (!res.ok) {
        throw new Error("Could not load discussion");
      }
      return forumPostItemSchema.parse(await res.json());
    },
    enabled: Boolean(postId),
    retry: false,
  });
}

export function usePostRepliesQuery(postId: string) {
  return useInfiniteQuery<ForumRepliesResponse>({
    queryKey: ["forum-replies", postId],
    queryFn: async ({ pageParam }) => {
      const url = new URL(`${apiUrl}/forum/posts/${encodeURIComponent(postId)}/replies`);
      url.searchParams.set("limit", "10");
      if (typeof pageParam === "string" && pageParam) {
        url.searchParams.set("cursor", pageParam);
      }

      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) {
        throw new Error("Could not load replies");
      }
      return forumRepliesResponseSchema.parse(await res.json());
    },
    initialPageParam: null as string | null,
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
    enabled: Boolean(postId),
  });
}

function invalidateForumPostCache(queryClient: ReturnType<typeof useQueryClient>, postId: string) {
  void queryClient.invalidateQueries({ queryKey: ["forum-feed"] });
  void queryClient.invalidateQueries({ queryKey: ["forum-post", postId] });
  void queryClient.invalidateQueries({ queryKey: ["forum-replies", postId] });
}

export function useCreateForumPostMutation() {
  const queryClient = useQueryClient();

  return useMutation<ForumPostItem, Error, CreateForumPost>({
    mutationFn: async payload => {
      const res = await fetch(`${apiUrl}/forum/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const message = await parseErrorMessage(res, "Failed to publish post");
        throw new Error(message);
      }
      return forumPostItemSchema.parse(await res.json());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["forum-feed"] });
    },
  });
}

export function useUpdateForumPostMutation(postId: string) {
  const queryClient = useQueryClient();

  return useMutation<ForumPostItem, Error, UpdateForumPost>({
    mutationFn: async payload => {
      const res = await fetch(`${apiUrl}/forum/posts/${encodeURIComponent(postId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const message = await parseErrorMessage(res, "Failed to update post");
        throw new Error(message);
      }
      return forumPostItemSchema.parse(await res.json());
    },
    onSuccess: () => {
      invalidateForumPostCache(queryClient, postId);
    },
  });
}

export function useDeleteForumPostMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async postId => {
      const res = await fetch(`${apiUrl}/forum/posts/${encodeURIComponent(postId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const message = await parseErrorMessage(res, "Failed to delete post");
        throw new Error(message);
      }
    },
    onSuccess: (_data, postId) => {
      void queryClient.invalidateQueries({ queryKey: ["forum-feed"] });
      queryClient.removeQueries({ queryKey: ["forum-post", postId] });
    },
  });
}

export function useCreateReplyMutation(postId: string) {
  const queryClient = useQueryClient();

  return useMutation<ForumReplyItem, Error, CreateForumReply>({
    mutationFn: async payload => {
      const res = await fetch(`${apiUrl}/forum/posts/${encodeURIComponent(postId)}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const message = await parseErrorMessage(res, "Failed to publish reply");
        throw new Error(message);
      }
      return forumReplyItemSchema.parse(await res.json());
    },
    onSuccess: () => {
      invalidateForumPostCache(queryClient, postId);
    },
  });
}

export function useUpdateReplyMutation(postId: string) {
  const queryClient = useQueryClient();

  return useMutation<ForumReplyItem, Error, { replyId: string; data: UpdateForumReply }>({
    mutationFn: async ({ replyId, data }) => {
      const res = await fetch(`${apiUrl}/forum/replies/${encodeURIComponent(replyId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const message = await parseErrorMessage(res, "Failed to update reply");
        throw new Error(message);
      }
      return forumReplyItemSchema.parse(await res.json());
    },
    onSuccess: () => {
      invalidateForumPostCache(queryClient, postId);
    },
  });
}

export function useDeleteReplyMutation(postId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async replyId => {
      const res = await fetch(`${apiUrl}/forum/replies/${encodeURIComponent(replyId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const message = await parseErrorMessage(res, "Failed to delete reply");
        throw new Error(message);
      }
    },
    onSuccess: () => {
      invalidateForumPostCache(queryClient, postId);
    },
  });
}

export function useModerateForumPostMutation(postId: string) {
  const queryClient = useQueryClient();

  return useMutation<ForumPostItem, Error, ModerateForumContent>({
    mutationFn: async payload => {
      const res = await fetch(`${apiUrl}/forum/posts/${encodeURIComponent(postId)}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const message = await parseErrorMessage(res, "Failed to moderate post");
        throw new Error(message);
      }
      return forumPostItemSchema.parse(await res.json());
    },
    onSuccess: () => {
      invalidateForumPostCache(queryClient, postId);
    },
  });
}

export function useModerateReplyMutation(postId: string) {
  const queryClient = useQueryClient();

  return useMutation<ForumReplyItem, Error, { replyId: string; data: ModerateForumContent }>({
    mutationFn: async ({ replyId, data }) => {
      const res = await fetch(`${apiUrl}/forum/replies/${encodeURIComponent(replyId)}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const message = await parseErrorMessage(res, "Failed to moderate reply");
        throw new Error(message);
      }
      return forumReplyItemSchema.parse(await res.json());
    },
    onSuccess: () => {
      invalidateForumPostCache(queryClient, postId);
    },
  });
}
