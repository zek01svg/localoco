import { sql } from "drizzle-orm";
import {
  boolean,
  pgPolicy,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import z from "zod/v4";

// --- Auth Tables ---

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    hasBusiness: boolean("has_business").default(false).notNull(),
    referralCode: text("referral_code").notNull().default(""),
    referredByUserId: text("referred_by_user_id").notNull().default(""),
    bio: text("bio").notNull().default(""),
  },
  () => [
    pgPolicy("user_public_read", { for: "select", using: sql`true` }),
    pgPolicy("user_owner_update", {
      for: "update",
      to: "authenticated",
      using: sql`id = (select auth.uid())::text`,
    }),
    pgPolicy("user_owner_delete", {
      for: "delete",
      to: "authenticated",
      using: sql`id = (select auth.uid())::text`,
    }),
  ]
);

export const selectUserSchema = createSelectSchema(user);
export const insertUserSchema = createInsertSchema(user);
export type User = z.infer<typeof selectUserSchema>;
export type InsertUser = typeof user.$inferInsert;

export const getUserProfileSchema = z.object({
  id: z.string().min(1, "User ID is required"),
});

export const updateProfileSchema = z.object({
  id: z.string().min(1, "User ID is required"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  image: z.string().default(""),
  bio: z.string().default(""),
  hasBusiness: z.boolean().default(false),
});

export const getAuthProviderSchema = z.object({
  id: z.string().min(1, "User ID is required"),
});

export const deleteProfileSchema = z.object({
  id: z.string().min(1, "User ID is required"),
});

export const handleReferralSchema = z.object({
  referralCode: z.string().min(1, "Referral code is required"),
  referredId: z.string().min(1, "Referred ID is required"),
});

export const getUserVouchersSchema = z.object({
  status: z.enum(["issued", "used", "expired", "revoked"]).optional(),
  page: z.number().int().default(1),
  limit: z.number().int().default(100),
});

export const updateVoucherStatusSchema = z.object({
  voucherId: z.number().int().positive("Voucher ID must be a positive number"),
});

export const checkEmailAvailabilitySchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
