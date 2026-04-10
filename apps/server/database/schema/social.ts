import { sql } from "drizzle-orm";
import {
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import z from "zod/v4";

import { user } from "./auth";
import { businesses } from "./business";

// --- Social & Engagement Tables ---

export const bookmarkedBusinesses = pgTable(
  "bookmarked_businesses",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    uen: varchar("uen", { length: 20 })
      .notNull()
      .references(() => businesses.uen, { onDelete: "cascade" }),
  },
  (table) => [
    { pk: unique().on(table.userId, table.uen) },
    pgPolicy("bookmarks_owner_access", {
      for: "all",
      to: "authenticated",
      using: sql`user_id = (select auth.uid())::text`,
    }),
  ]
);

export const selectBookmarkedBusinessSchema =
  createSelectSchema(bookmarkedBusinesses);
export const insertBookmarkedBusinessSchema =
  createInsertSchema(bookmarkedBusinesses);
export type BookmarkedBusiness = z.infer<typeof selectBookmarkedBusinessSchema>;
export type InsertBookmarkedBusiness = z.infer<
  typeof insertBookmarkedBusinessSchema
>;

export const getUserBookmarksSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

export const updateBookmarksSchema = z.object({
  clicked: z.boolean(),
  uen: z.string().min(1, "UEN is required"),
});

export const businessReviews = pgTable(
  "business_reviews",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    email: text("user_email")
      .notNull()
      .references(() => user.email, { onDelete: "cascade" }),
    uen: varchar("uen", { length: 20 })
      .notNull()
      .references(() => businesses.uen, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    body: text("body").notNull(),
    likeCount: integer("like_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  () => [
    pgPolicy("reviews_public_read", { for: "select", using: sql`true` }),
    pgPolicy("reviews_insert", {
      for: "insert",
      to: "authenticated",
      withCheck: sql`user_email = (select auth.email())::text`,
    }),
    pgPolicy("reviews_owner_modify", {
      for: "all",
      to: "authenticated",
      using: sql`user_email = (select auth.email())::text`,
    }),
  ]
);

export const selectBusinessReviewSchema = createSelectSchema(businessReviews);
export const insertBusinessReviewSchema = createInsertSchema(businessReviews);
export type BusinessReview = z.infer<typeof selectBusinessReviewSchema>;
export type InsertBusinessReview = z.infer<typeof insertBusinessReviewSchema>;

export const newReviewSchema = z.object({
  uen: z.string().min(1, "Business UEN is required"),
  body: z.string().min(1, "Review body is required"),
  rating: z.number().int().min(1).max(5),
  likeCount: z.number().int().default(0),
});

export const getBusinessReviewsSchema = z.object({
  uen: z.string().min(1, "UEN is required"),
});

export const updateReviewSchema = z.object({
  id: z.number().int().positive("Review ID must be a positive number"),
  rating: z.number().int().min(1).max(5),
  body: z.string().min(1, "Review body is required"),
});

export const deleteReviewSchema = z.object({
  id: z.number().int().positive("Review ID must be a positive number"),
});

export const updateReviewLikesSchema = z.object({
  reviewId: z.number().int().positive("Review ID must be a positive number"),
  clicked: z.boolean(),
});

export const businessAnnouncements = pgTable(
  "business_announcements",
  {
    announcementId: integer("announcement_id")
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    uen: varchar("uen", { length: 20 })
      .notNull()
      .references(() => businesses.uen, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    imageUrl: text("image_url").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  () => [
    pgPolicy("announcements_public_read", { for: "select", using: sql`true` }),
    pgPolicy("announcements_owner_modify", {
      for: "all",
      to: "authenticated",
      using: sql`exists (select 1 from businesses b where b.uen = business_announcements.uen and b.owner_id = (select auth.uid())::text)`,
    }),
  ]
);

export const selectBusinessAnnouncementSchema = createSelectSchema(
  businessAnnouncements
);
export const insertBusinessAnnouncementSchema = createInsertSchema(
  businessAnnouncements
);
export type BusinessAnnouncement = z.infer<
  typeof selectBusinessAnnouncementSchema
>;
export type InsertBusinessAnnouncement = z.infer<
  typeof insertBusinessAnnouncementSchema
>;

// --- API Valdiation Schemas ---

export const createAnnouncementSchema = z.object({
  uen: z.string().min(1, "Business UEN is required"),
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  imageUrl: z.string("Invalid image URL").default(""),
});

export const getAnnouncementsByUenSchema = z.object({
  uen: z.string().min(1, "UEN is required"),
});

export const updateAnnouncementSchema = z.object({
  announcementId: z.number().int().positive("Announcement ID must be positive"),
  uen: z.string().min(1, "Business UEN is required"),
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  imageUrl: z.string("Invalid image URL").default(""),
});

export const deleteAnnouncementSchema = z.object({
  announcementId: z.number().int().positive("Announcement ID must be positive"),
});
