import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import type z from "zod/v4";

import { user } from "./auth";
import { voucherStatusEnum } from "./enums";

// --- Rewards Table ---

export const vouchers = pgTable("vouchers", {
  voucherId: integer("voucher_id").primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  status: voucherStatusEnum("status").default("issued").notNull(),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const selectVoucherSchema = createSelectSchema(vouchers);
export const insertVoucherSchema = createInsertSchema(vouchers);
export type Voucher = z.infer<typeof selectVoucherSchema>;
export type InsertVoucher = z.infer<typeof insertVoucherSchema>;

export const userPoints = pgTable("user_points", {
  email: text("user_email")
    .primaryKey()
    .references(() => user.email, { onDelete: "cascade" }),
  points: integer("points").default(0).notNull(),
});

export const selectUserPointsSchema = createSelectSchema(userPoints);
export const insertUserPointsSchema = createInsertSchema(userPoints);
export type UserPoints = z.infer<typeof selectUserPointsSchema>;
export type InsertUserPoints = z.infer<typeof insertUserPointsSchema>;
