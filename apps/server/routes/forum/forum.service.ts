import db from "@server/database/db";
import type {
  createPostSchema,
  createReplySchema,
} from "@server/database/schema";
import { forumPosts, forumPostsReplies } from "@server/database/schema";
import logger from "@server/lib/pino";
import { desc, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import type { z } from "zod/v4";

import { _addPoints, _hydrate } from "./helpers";

type CreatePostInput = z.infer<typeof createPostSchema> & { email: string };
type CreateReplyInput = z.infer<typeof createReplySchema> & { email: string };

export async function getForumPosts() {
  const posts = await db.query.forumPosts.findMany({
    orderBy: [desc(forumPosts.createdAt)],
    with: {
      user: { columns: { image: true } },
      business: { columns: { businessName: true } },
      forumPostsReplies: {
        with: {
          user: { columns: { image: true } },
        },
        orderBy: [forumPostsReplies.createdAt],
      },
    },
  });

  return posts.map(_hydrate);
}

export async function getForumPostsByUen(uen: string) {
  const posts = await db.query.forumPosts.findMany({
    where: eq(forumPosts.uen, uen),
    orderBy: [desc(forumPosts.createdAt)],
    with: {
      user: { columns: { image: true } },
      business: { columns: { businessName: true } },
      forumPostsReplies: {
        with: {
          user: { columns: { image: true } },
        },
        orderBy: [forumPostsReplies.createdAt],
      },
    },
  });

  return posts.map(_hydrate);
}

export async function createForumPost(postData: CreatePostInput) {
  const [result] = await db
    .insert(forumPosts)
    .values(postData as any)
    .returning();
  if (!result) {
    throw new HTTPException(500, {
      message: "Failed to create new forum post",
    });
  }

  await _addPoints(postData.email, 5);
  logger.info(
    {
      postId: result.id,
      email: postData.email,
      uen: postData.uen,
    },
    "New forum post created"
  );
}

export async function createForumReply(replyData: CreateReplyInput) {
  const [result] = await db
    .insert(forumPostsReplies)
    .values(replyData as any)
    .returning();
  if (!result) {
    throw new HTTPException(500, {
      message: "Failed to create new forum reply",
    });
  }

  await _addPoints(replyData.email, 2);
  logger.info(
    {
      replyId: result.id,
      postId: replyData.postId,
      email: replyData.email,
    },
    "New forum reply created"
  );
}

export async function likeForumPost(payload: {
  postId: number;
  clicked: boolean;
}) {
  const post = await db.query.forumPosts.findFirst({
    where: eq(forumPosts.id, payload.postId),
  });

  if (!post) {
    throw new HTTPException(404, { message: "Post not found" });
  }

  const newLikeCount = payload.clicked
    ? post.likeCount + 1
    : Math.max(post.likeCount - 1, 0);

  const [updated] = await db
    .update(forumPosts)
    .set({ likeCount: newLikeCount })
    .where(eq(forumPosts.id, payload.postId))
    .returning();

  if (!updated) {
    throw new HTTPException(500, { message: "Failed to update likes" });
  }

  const result = await db.query.forumPosts.findFirst({
    where: eq(forumPosts.id, payload.postId),
    with: {
      user: { columns: { image: true } },
      business: { columns: { businessName: true } },
      forumPostsReplies: {
        with: {
          user: { columns: { image: true } },
        },
        orderBy: [forumPostsReplies.createdAt],
      },
    },
  });

  return _hydrate(result);
}

export async function likeForumReply(payload: {
  replyId: number;
  clicked: boolean;
}) {
  const reply = await db.query.forumPostsReplies.findFirst({
    where: eq(forumPostsReplies.id, payload.replyId),
  });

  if (!reply) {
    throw new HTTPException(404, { message: "Reply not found" });
  }

  const newLikeCount = payload.clicked
    ? (reply.likeCount ?? 0) + 1
    : Math.max((reply.likeCount ?? 0) - 1, 0);

  const [updated] = await db
    .update(forumPostsReplies)
    .set({ likeCount: newLikeCount })
    .where(eq(forumPostsReplies.id, payload.replyId))
    .returning();

  return updated;
}
