import { sql } from "drizzle-orm";
import {
  boolean,
  decimal,
  integer,
  pgPolicy,
  pgTable,
  text,
  time,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import z from "zod/v4";

import { user } from "./auth";
import type { DayOfWeek, HourEntry, PaymentOption } from "./enums";
import { dayOfWeekEnum, paymentOptionEnum, priceTierEnum } from "./enums";

export const businesses = pgTable(
  "businesses",
  {
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    uen: varchar("uen", { length: 20 }).primaryKey(),
    businessName: text("business_name").notNull(),
    businessCategory: text("business_category").notNull(),
    description: text("description").notNull(),
    address: text("address").notNull(),
    latitude: decimal("latitude", { precision: 9, scale: 6 }).notNull(),
    longitude: decimal("longitude", { precision: 9, scale: 6 }).notNull(),
    open247: boolean("open247").default(false).notNull(),
    email: text("email").notNull().default(""),
    phoneNumber: text("phone_number").notNull().default(""),
    websiteUrl: text("website_url").notNull().default(""),
    socialMediaUrl: text("social_media_url").notNull().default(""),
    wallpaperUrl: text("wallpaper_url").notNull(),
    priceTier: priceTierEnum("price_tier").notNull(),
    offersDelivery: boolean("offers_delivery").default(false).notNull(),
    offersPickup: boolean("offers_pickup").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  () => [
    pgPolicy("business_public_read", { for: "select", using: sql`true` }),
    pgPolicy("business_owner_modify", {
      for: "all",
      to: "authenticated",
      using: sql`owner_id = (select auth.uid())::text`,
    }),
  ]
);

export const businessesSelectSchema = createSelectSchema(businesses);
export const businessesInsertSchema = createInsertSchema(businesses);
export type Business = z.infer<typeof businessesSelectSchema>;
export type InsertBusiness = z.infer<typeof businessesInsertSchema>;

const HourEntrySchema = z.object({
  open: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)"),
  close: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)"),
});

const BusinessBaseSchema = z.object({
  ownerId: z.string().min(1, "Owner ID is required"),
  uen: z.string().min(9, "UEN must be at least 9 characters"),
  businessName: z.string().min(1, "Business name is required"),
  businessCategory: z.string().min(1, "Business category is required"),
  description: z.string().min(1, "Description is required"),
  address: z.string().min(1, "Address is required"),
  latitude: z.string().or(z.number()).pipe(z.coerce.string()),
  longitude: z.string().or(z.number()).pipe(z.coerce.string()),
  open247: z.boolean().default(false),
  openingHours: z.record(z.enum(dayOfWeekEnum.enumValues), HourEntrySchema),
  email: z.string().email("Invalid email address").default(""),
  phoneNumber: z.string().min(8, "Phone number seems too short").default(""),
  websiteUrl: z.string().url("Invalid URL").default("").or(z.literal("")),
  socialMediaUrl: z.string().url("Invalid URL").default("").or(z.literal("")),
  wallpaperUrl: z
    .string()
    .url("Invalid URL")
    .min(1, "Wallpaper URL is required"),
  priceTier: z.enum(priceTierEnum.enumValues),
  offersDelivery: z.boolean().default(false),
  offersPickup: z.boolean().default(false),
  paymentOptions: z.array(z.enum(paymentOptionEnum.enumValues)),
});

export const registerBusinessSchema = BusinessBaseSchema.omit({
  ownerId: true,
});
export const updateBusinessSchema = BusinessBaseSchema;

export const getFilteredBusinessesSchema = z.object({
  search_query: z.string().optional(),
  price_tier: z
    .union([
      z.enum(priceTierEnum.enumValues),
      z.array(z.enum(priceTierEnum.enumValues)),
    ])
    .optional(),
  business_category: z.union([z.string(), z.array(z.string())]).optional(),
  newly_added: z.boolean().optional(),
  open247: z.boolean().optional(),
  offers_delivery: z.boolean().optional(),
  offers_pickup: z.boolean().optional(),
  payment_options: z.array(z.enum(paymentOptionEnum.enumValues)).optional(),
  sort_by: z
    .enum(["business_name", "date_of_creation", "price_tier"])
    .optional(),
  sort_order: z.enum(["asc", "desc"]).optional(),
});

export const getBusinessByUenSchema = z.object({
  uen: z.string().min(9, "UEN must be at least 9 characters"),
});

export const searchBusinessByNameSchema = z.object({
  name: z.string().min(1, "Search name is required"),
});

export const getOwnedBusinessesSchema = z.object({
  ownerId: z.string().min(1, "Owner ID is required"),
});

export const deleteBusinessSchema = z.object({
  uen: z.string().min(9, "UEN is required"),
});

export const checkUenAvailabilitySchema = z.object({
  uen: z.string().min(9, "UEN is required"),
});

export interface RegisterBusinessInput extends InsertBusiness {
  paymentOptions: PaymentOption[];
  openingHours?: Record<DayOfWeek, HourEntry>;
}

export interface UpdateBusinessInput extends InsertBusiness {
  paymentOptions?: PaymentOption[];
  openingHours?: Record<DayOfWeek, HourEntry>;
}

export const businessPaymentOptions = pgTable(
  "business_payment_options",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    uen: varchar("uen", { length: 20 })
      .notNull()
      .references(() => businesses.uen, { onDelete: "cascade" }),
    paymentOption: paymentOptionEnum("payment_option").notNull(),
  },
  () => [
    pgPolicy("payment_options_public_read", {
      for: "select",
      using: sql`true`,
    }),
    pgPolicy("payment_options_owner_modify", {
      for: "all",
      to: "authenticated",
      using: sql`exists (select 1 from businesses b where b.uen = businesses_payment_options.uen and b.owner_id = (select auth.uid())::text)`,
    }),
  ]
);

export const selectBusinessPaymentOptionSchema = createSelectSchema(
  businessPaymentOptions
);
export const insertBusinessPaymentOptionSchema = createInsertSchema(
  businessPaymentOptions
);
export type BusinessPaymentOption = z.infer<
  typeof selectBusinessPaymentOptionSchema
>;
export type InsertBusinessPaymentOption = z.infer<
  typeof insertBusinessPaymentOptionSchema
>;

export const businessOpeningHours = pgTable(
  "business_opening_hours",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    uen: varchar("uen", { length: 20 })
      .notNull()
      .references(() => businesses.uen, { onDelete: "cascade" }),
    dayOfWeek: dayOfWeekEnum("day_of_week").notNull(),
    openTime: time("open_time").notNull(),
    closeTime: time("close_time").notNull(),
  },
  () => [
    pgPolicy("opening_hours_public_read", { for: "select", using: sql`true` }),
    pgPolicy("opening_hours_owner_modify", {
      for: "all",
      to: "authenticated",
      using: sql`exists (select 1 from businesses b where b.uen = businesses_opening_hours.uen and b.owner_id = (select auth.uid())::text)`,
    }),
  ]
);

export const selectBusinessOpeningHourSchema =
  createSelectSchema(businessOpeningHours);
export const insertBusinessOpeningHourSchema =
  createInsertSchema(businessOpeningHours);
export type BusinessOpeningHour = z.infer<
  typeof selectBusinessOpeningHourSchema
>;
export type InsertBusinessOpeningHour = z.infer<
  typeof insertBusinessOpeningHourSchema
>;
