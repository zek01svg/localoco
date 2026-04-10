import { pgEnum } from "drizzle-orm/pg-core";

export const dayOfWeekEnum = pgEnum("day_of_week", [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]);

export const priceTierEnum = pgEnum("price_tier", ["low", "medium", "high"]);

export const voucherStatusEnum = pgEnum("voucher_status", [
  "issued",
  "used",
  "expired",
  "revoked",
]);

export const referralStatusEnum = pgEnum("referral_status", [
  "claimed",
  "qualified",
  "rewarded",
  "rejected",
]);

export const paymentOptionEnum = pgEnum("payment_option", [
  "cash",
  "card",
  "paynow",
  "digital_wallets",
]);

// Convenience types derived from pg enums
export type DayOfWeek = (typeof dayOfWeekEnum.enumValues)[number];
export type PriceTier = (typeof priceTierEnum.enumValues)[number];
export type VoucherStatus = (typeof voucherStatusEnum.enumValues)[number];
export type ReferralStatus = (typeof referralStatusEnum.enumValues)[number];
export type PaymentOption = (typeof paymentOptionEnum.enumValues)[number];

/** A single opening-hour slot */
export interface HourEntry {
  open: string;
  close: string;
}
