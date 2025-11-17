import { z } from 'zod';

const PriceTierSchema = z.enum(['low', 'medium', 'high']);
const DayOfWeekSchema = z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
const PaymentOptionSchema = z.enum(['cash', 'card', 'paynow', 'digital_wallets']);

const HourEntrySchema = z.object({
    open: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)"),
    close: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)"),
});

// base schema for business data
const BusinessBaseSchema = z.object({
    ownerId: z.string().min(1),
    uen: z.string().min(9, "UEN must be at least 9 characters"),
    businessName: z.string().min(1, "Business name is required"),
    businessCategory: z.string().min(1, "Business category is required"),
    description: z.string().min(1, "Description is required"),
    address: z.string().min(1, "Address is required"),
    latitude: z.string().or(z.number()).pipe(z.coerce.string()), 
    longitude: z.string().or(z.number()).pipe(z.coerce.string()),
    open247: z.boolean().default(false),
    openingHours: z.record(DayOfWeekSchema, HourEntrySchema).optional(),
    email: z.email("Invalid email address").nullable().optional(),
    phoneNumber: z.string().min(8, "Phone number seems too short").nullable().optional(),
    websiteUrl: z.url("Invalid URL").nullable().optional(),
    socialMediaUrl: z.url("Invalid URL").nullable().optional(),
    wallpaperUrl: z.url("Invalid URL").min(1, "Wallpaper URL is required"),
    priceTier: PriceTierSchema,
    offersDelivery: z.boolean().default(false),
    offersPickup: z.boolean().default(false),
    paymentOptions: z.array(PaymentOptionSchema).optional(),
});

// for registering a business
export const registerBusinessSchema = BusinessBaseSchema;

// for updating a business 
export const updateBusinessSchema = BusinessBaseSchema.partial().extend({
    uen: z.string().min(9, "UEN must be at least 9 characters"),
});

// for getFilteredBusinesses
export const getFilteredBusinessesSchema = z.object({
    search_query: z.string().optional(),
    price_tier: z.union([PriceTierSchema, z.array(PriceTierSchema)]).optional(),
    business_category: z.union([z.string(), z.array(z.string())]).optional(),
    newly_added: z.boolean().optional(),
    open247: z.boolean().optional(),
    offers_delivery: z.boolean().optional(),
    offers_pickup: z.boolean().optional(),
    payment_options: z.array(PaymentOptionSchema).optional(),
    sort_by: z.enum(['business_name', 'date_of_creation', 'price_tier']).optional(),
    sort_order: z.enum(['asc', 'desc']).optional(),
});

// for getBusinessByUen
export const getBusinessByUenSchema = z.object({
    uen: z.string().min(9, "UEN must be at least 9 characters"),
});

// for searchBusinessByName
export const searchBusinessByNameSchema = z.object({
    name: z.string().min(1, "Search name is required"),
});

// for getOwnedBusinesses
export const getOwnedBusinessesSchema = z.object({
    ownerId: z.string().min(1, "Owner ID is required"),
});

// for deleteBusiness
export const deleteBusinessSchema = z.object({
    uen: z.string().min(9, "UEN is required"),
});

// for checkUenAvailability
export const checkUenAvailabilitySchema = z.object({
    uen: z.string().min(9, "UEN is required"),
});