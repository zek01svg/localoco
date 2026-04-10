import db from "@server/database/db";
import { user, vouchers } from "@server/database/schema";
import logger from "@server/lib/pino";
import redis from "@server/lib/redis";
import type { HydratedUser } from "@shared/types/user.types";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

export async function getUserProfile(userId: string): Promise<HydratedUser> {
  const cachedUser = await redis.get<HydratedUser>(`user:${userId}`);
  if (cachedUser) {
    logger.info(
      { userId, cacheKey: `user:${userId}` },
      "Cache hit for user profile"
    );
    return cachedUser;
  }

  const profile = await db.query.user.findFirst({
    where: eq(user.id, userId),
    with: {
      vouchers: true,
      userPoints: true,
      businessReviews: true,
    },
  });

  if (!profile) {
    throw new HTTPException(404, { message: "User not found" });
  }

  const userData: HydratedUser = {
    profile: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      emailVerified: profile.emailVerified,
      image: profile.image,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      referralCode: profile.referralCode,
      referredByUserId: profile.referredByUserId || "",
      bio: profile.bio || "",
      hasBusiness: profile.hasBusiness,
    },
    points: profile.userPoints[0]?.points ?? 0,
    reviews: profile.businessReviews,
    vouchers: profile.vouchers,
    successfulReferrals: 0,
  };

  await redis.set(`user:${userId}`, userData, { ex: 3600 });
  return userData;
}

export async function getAuthProvider(userId: string) {
  const accountData = await db.query.account.findFirst({
    where: (accounts, { eq }) => eq(accounts.userId, userId),
  });

  return accountData?.providerId ?? "email";
}

export async function updateUserProfile(
  updateProfileData: Record<string, unknown>
) {
  const updatedUserResult = await db
    .update(user)
    .set(updateProfileData)
    .where(eq(user.id, updateProfileData.id as string))
    .returning();

  if (updatedUserResult.length === 0) {
    throw new HTTPException(500, { message: "Failed to update user profile" });
  }

  await redis.del(`user:${updateProfileData.id as string}`);
  logger.info({ userId: updateProfileData.id }, "User profile updated");

  return updatedUserResult[0];
}

export async function deleteUserProfile(id: string) {
  const rawResult = await db.delete(user).where(eq(user.id, id)).returning();
  if (rawResult.length === 0) {
    throw new HTTPException(500, { message: "Failed to delete user profile" });
  }

  await redis.del(`user:${id}`);
}

export async function checkEmailAvailability(email: string) {
  const userData = await db.query.user.findFirst({
    where: eq(user.email, email),
    columns: { id: true },
  });

  return !userData;
}

export async function getUserVouchers(payload: {
  id: string;
  status?: string | undefined;
  page: number;
  limit: number;
}) {
  const profile = await db.query.user.findFirst({
    where: eq(user.id, payload.id),
    with: { vouchers: true },
  });

  if (!profile) {
    throw new HTTPException(404, { message: "User not found" });
  }

  let userVouchers = profile.vouchers;
  if (payload.status) {
    userVouchers = userVouchers.filter((v: any) => v.status === payload.status);
  }

  const startIndex = (payload.page - 1) * payload.limit;
  const endIndex = startIndex + payload.limit;
  const paginatedVouchers = userVouchers.slice(startIndex, endIndex);

  return {
    vouchers: paginatedVouchers,
    total: userVouchers.length,
    page: payload.page,
    limit: payload.limit,
  };
}

export async function getVoucherById(voucherId: number) {
  const voucher = await db.query.vouchers.findFirst({
    where: eq(vouchers.voucherId, voucherId),
  });
  if (!voucher) {
    throw new HTTPException(404, { message: "Voucher not found" });
  }
  return voucher;
}

export async function updateVoucherStatus(voucherId: number) {
  const result = await db
    .update(vouchers)
    .set({ status: "used" })
    .where(eq(vouchers.voucherId, voucherId))
    .returning();

  if (result.length === 0) {
    throw new HTTPException(500, {
      message: "Failed to update voucher status",
    });
  }
}
