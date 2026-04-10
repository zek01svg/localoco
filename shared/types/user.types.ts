import type { BusinessReview, User, Voucher } from "@server/database/schema";

/**
 * HydratedUser Interface
 * Represents a user with all their related data including vouchers,
 * earned points, reviews, and referral statistics.
 */
export interface HydratedUser {
  profile: User;
  vouchers: Voucher[];
  points: number;
  reviews: BusinessReview[];
  successfulReferrals: number;
}
