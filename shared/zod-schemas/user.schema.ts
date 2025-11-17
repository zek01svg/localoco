import { z } from 'zod';

// for getUserProfile
export const getUserProfileSchema = z.object({
    userId: z.string().min(1, "User ID is required"),
});

// for updateProfile
export const updateProfileSchema = z.object({
    userId: z.string().min(1, "User ID is required"),
    name: z.string().min(1, "Name is required"),
    email: z.email("Invalid email address"),
    imageUrl: z.url("Invalid image URL").nullable().optional(),
    bio: z.string().nullable().optional(),
    hasBusiness: z.boolean().optional(),
});

// for getAuthProvider
export const getAuthProviderSchema = z.object({
    userId: z.string().min(1, "User ID is required"),
});

// for deleteProfile
export const deleteProfileSchema = z.object({
    userId: z.string().min(1, "User ID is required"),
});

// for handleReferral
export const handleReferralSchema = z.object({
    referralCode: z.string().min(1, "Referral code is required"),
    referredId: z.string().min(1, "Referred ID is required"),
});

// for getUserVouchers
export const getUserVouchersSchema = z.object({
    userId: z.string().min(1, "User ID is required"),
    status: z.enum(["issued", "used", "expired", "revoked"]).optional(),
    page: z.number().int().positive().optional(),
    limit: z.number().int().positive().optional(),
});

// for updateVoucherStatus
export const updateVoucherStatusSchema = z.object({
    voucherId: z.number().int().positive("Voucher ID must be a positive number"),
});

// for checkEmailAvailability
export const checkEmailAvailabilitySchema = z.object({
    email: z.email("Invalid email address"),
});