import { relations } from "drizzle-orm/relations";
import { user, account, businesses, bookmarkedBusinesses, businessAnnouncements, businessOpeningHours, businessPaymentOptions, businessReviews, forumPosts, forumPostsReplies, referrals, session, userPoints, vouchers } from "./schema";

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	accounts: many(account),
	bookmarkedBusinesses: many(bookmarkedBusinesses),
	businessReviews: many(businessReviews),
	businesses: many(businesses),
	forumPosts: many(forumPosts),
	forumPostsReplies: many(forumPostsReplies),
	referrals_referredId: many(referrals, {
		relationName: "referrals_referredId_user_id"
	}),
	referrals_referrerId: many(referrals, {
		relationName: "referrals_referrerId_user_id"
	}),
	sessions: many(session),
	userPoints: many(userPoints),
	vouchers: many(vouchers),
}));

export const bookmarkedBusinessesRelations = relations(bookmarkedBusinesses, ({one}) => ({
	business: one(businesses, {
		fields: [bookmarkedBusinesses.uen],
		references: [businesses.uen]
	}),
	user: one(user, {
		fields: [bookmarkedBusinesses.userId],
		references: [user.id]
	}),
}));

export const businessesRelations = relations(businesses, ({one, many}) => ({
	bookmarkedBusinesses: many(bookmarkedBusinesses),
	businessAnnouncements: many(businessAnnouncements),
	businessOpeningHours: many(businessOpeningHours),
	businessPaymentOptions: many(businessPaymentOptions),
	businessReviews: many(businessReviews),
	user: one(user, {
		fields: [businesses.ownerId],
		references: [user.id]
	}),
	forumPosts: many(forumPosts),
}));

export const businessAnnouncementsRelations = relations(businessAnnouncements, ({one}) => ({
	business: one(businesses, {
		fields: [businessAnnouncements.uen],
		references: [businesses.uen]
	}),
}));

export const businessOpeningHoursRelations = relations(businessOpeningHours, ({one}) => ({
	business: one(businesses, {
		fields: [businessOpeningHours.uen],
		references: [businesses.uen]
	}),
}));

export const businessPaymentOptionsRelations = relations(businessPaymentOptions, ({one}) => ({
	business: one(businesses, {
		fields: [businessPaymentOptions.uen],
		references: [businesses.uen]
	}),
}));

export const businessReviewsRelations = relations(businessReviews, ({one}) => ({
	business: one(businesses, {
		fields: [businessReviews.uen],
		references: [businesses.uen]
	}),
	user: one(user, {
		fields: [businessReviews.userEmail],
		references: [user.email]
	}),
}));

export const forumPostsRelations = relations(forumPosts, ({one, many}) => ({
	business: one(businesses, {
		fields: [forumPosts.uen],
		references: [businesses.uen]
	}),
	user: one(user, {
		fields: [forumPosts.userEmail],
		references: [user.email]
	}),
	forumPostsReplies: many(forumPostsReplies),
}));

export const forumPostsRepliesRelations = relations(forumPostsReplies, ({one}) => ({
	user: one(user, {
		fields: [forumPostsReplies.email],
		references: [user.email]
	}),
	forumPost: one(forumPosts, {
		fields: [forumPostsReplies.postId],
		references: [forumPosts.id]
	}),
}));

export const referralsRelations = relations(referrals, ({one, many}) => ({
	user_referredId: one(user, {
		fields: [referrals.referredId],
		references: [user.id],
		relationName: "referrals_referredId_user_id"
	}),
	user_referrerId: one(user, {
		fields: [referrals.referrerId],
		references: [user.id],
		relationName: "referrals_referrerId_user_id"
	}),
	vouchers: many(vouchers),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const userPointsRelations = relations(userPoints, ({one}) => ({
	user: one(user, {
		fields: [userPoints.userEmail],
		references: [user.email]
	}),
}));

export const vouchersRelations = relations(vouchers, ({one}) => ({
	referral: one(referrals, {
		fields: [vouchers.refId],
		references: [referrals.refId]
	}),
	user: one(user, {
		fields: [vouchers.userId],
		references: [user.id]
	}),
}));