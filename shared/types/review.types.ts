import type { BusinessReview } from "@server/database/schema";

export interface HydratedReview extends BusinessReview {
  userName: string;
  userImage: string;
}

export interface UpdateReviewData {
  rating: number;
  body: string;
}
