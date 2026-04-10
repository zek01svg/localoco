import db from "@server/database/db";
import { userPoints } from "@server/database/schema";
import logger from "@server/lib/pino";
import type { HydratedForumPost } from "@shared/types/forum-post.types";
import { sql } from "drizzle-orm";

export const _addPoints = async (email: string, amount: number) => {
  try {
    await db
      .insert(userPoints)
      .values({ email, points: amount })
      .onConflictDoUpdate({
        target: userPoints.email,
        set: { points: sql`${userPoints.points} + ${amount}` },
      });
  } catch (err) {
    logger.error({ err, email }, "Failed to add points");
  }
};

export const _hydrate = (raw: any): HydratedForumPost => {
  return {
    id: raw.id,
    email: raw.email,
    imageUrl: raw.user?.image || "",
    uen: raw.uen || "",
    businessName: raw.business?.businessName || "",
    title: raw.title || "",
    body: raw.body,
    likeCount: raw.likeCount ?? 0,
    createdAt: raw.createdAt,
    replies: (raw.forumPostsReplies || []).map((r: any) => ({
      id: r.id,
      postId: r.postId,
      email: r.email,
      imageUrl: r.user?.image || "",
      body: r.body,
      likeCount: r.likeCount ?? 0,
      createdAt: r.createdAt,
    })),
  };
};
