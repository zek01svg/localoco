import { relations } from "drizzle-orm/relations";

import { account, session, user } from "./auth";
import {
  businesses,
  businessOpeningHours,
  businessPaymentOptions,
} from "./business";
import { forumPosts, forumPostsReplies } from "./forum";
import { userPoints, vouchers } from "./rewards";
import {
  bookmarkedBusinesses,
  businessAnnouncements,
  businessReviews,
} from "./social";

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const userRelations = relations(user, ({ many }) => ({
  accounts: many(account),
  bookmarkedBusinesses: many(bookmarkedBusinesses),
  businesses: many(businesses),
  businessReviews: many(businessReviews),
  forumPosts: many(forumPosts),
  forumPostsReplies: many(forumPostsReplies),
  sessions: many(session),
  userPoints: many(userPoints),
  vouchers: many(vouchers),
}));

export const bookmarkedBusinessesRelations = relations(
  bookmarkedBusinesses,
  ({ one }) => ({
    business: one(businesses, {
      fields: [bookmarkedBusinesses.uen],
      references: [businesses.uen],
    }),
    user: one(user, {
      fields: [bookmarkedBusinesses.userId],
      references: [user.id],
    }),
  })
);

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  bookmarkedBusinesses: many(bookmarkedBusinesses),
  user: one(user, {
    fields: [businesses.ownerId],
    references: [user.id],
  }),
  businessAnnouncements: many(businessAnnouncements),
  businessOpeningHours: many(businessOpeningHours),
  businessPaymentOptions: many(businessPaymentOptions),
  businessReviews: many(businessReviews),
  forumPosts: many(forumPosts),
}));

export const businessAnnouncementsRelations = relations(
  businessAnnouncements,
  ({ one }) => ({
    business: one(businesses, {
      fields: [businessAnnouncements.uen],
      references: [businesses.uen],
    }),
  })
);

export const businessOpeningHoursRelations = relations(
  businessOpeningHours,
  ({ one }) => ({
    business: one(businesses, {
      fields: [businessOpeningHours.uen],
      references: [businesses.uen],
    }),
  })
);

export const businessPaymentOptionsRelations = relations(
  businessPaymentOptions,
  ({ one }) => ({
    business: one(businesses, {
      fields: [businessPaymentOptions.uen],
      references: [businesses.uen],
    }),
  })
);

export const businessReviewsRelations = relations(
  businessReviews,
  ({ one }) => ({
    business: one(businesses, {
      fields: [businessReviews.uen],
      references: [businesses.uen],
    }),
    user: one(user, {
      fields: [businessReviews.email],
      references: [user.email],
    }),
  })
);

export const forumPostsRelations = relations(forumPosts, ({ one, many }) => ({
  user: one(user, {
    fields: [forumPosts.email],
    references: [user.email],
  }),
  business: one(businesses, {
    fields: [forumPosts.uen],
    references: [businesses.uen],
  }),
  forumPostsReplies: many(forumPostsReplies),
}));

export const forumPostsRepliesRelations = relations(
  forumPostsReplies,
  ({ one }) => ({
    user: one(user, {
      fields: [forumPostsReplies.email],
      references: [user.email],
    }),
    forumPost: one(forumPosts, {
      fields: [forumPostsReplies.postId],
      references: [forumPosts.id],
    }),
  })
);

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const userPointsRelations = relations(userPoints, ({ one }) => ({
  user: one(user, {
    fields: [userPoints.email],
    references: [user.email],
  }),
}));

export const vouchersRelations = relations(vouchers, ({ one }) => ({
  user: one(user, {
    fields: [vouchers.userId],
    references: [user.id],
  }),
}));
