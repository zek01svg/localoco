import db from "@server/database/db";
import { bookmarkedBusinesses } from "@server/database/schema";
import redis from "@server/lib/redis";
import { and, eq } from "drizzle-orm";

export async function getUserBookmarks(userId: string) {
  const cached = await redis.get<any[]>(`user:bookmarks:${userId}`);
  if (cached) {
    return cached;
  }

  const bookmarks = await db.query.bookmarkedBusinesses.findMany({
    where: eq(bookmarkedBusinesses.userId, userId),
  });

  await redis.set(`user:bookmarks:${userId}`, bookmarks, { ex: 3600 });
  return bookmarks;
}

export async function updateBookmark(payload: {
  clicked: boolean;
  userId: string;
  uen: string;
}) {
  if (payload.clicked) {
    await db
      .insert(bookmarkedBusinesses)
      .values({ userId: payload.userId, uen: payload.uen })
      .onConflictDoNothing();
  } else {
    await db
      .delete(bookmarkedBusinesses)
      .where(
        and(
          eq(bookmarkedBusinesses.uen, payload.uen),
          eq(bookmarkedBusinesses.userId, payload.userId)
        )
      );
  }

  await redis.del(`user:bookmarks:${payload.userId}`);
}
