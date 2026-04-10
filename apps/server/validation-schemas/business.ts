import { z } from "zod/v4";

import { businessesSelectSchema } from "../database/schema/business";

export const HydratedReviewSchema = z.object({
  id: z.string(),
  rating: z.number(),
  comment: z.string().optional(),
  userName: z.string(),
  userImage: z.string(),
});

export const HydratedBusinessSchema = businessesSelectSchema.extend({
  avgRating: z.number(),
  reviews: z.array(HydratedReviewSchema),
  paymentOptions: z.array(z.string()),
  openingHours: z.record(
    z.string(),
    z.object({ open: z.string(), close: z.string() })
  ),
});
