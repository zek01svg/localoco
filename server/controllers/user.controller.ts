import { Context } from "hono";
import UserService from "../services/user.service";
import { checkEmailAvailabilitySchema, deleteProfileSchema, getAuthProviderSchema, getUserProfileSchema, getUserVouchersSchema, handleReferralSchema, updateProfileSchema, updateVoucherStatusSchema } from "../../shared/zod-schemas/user.schema";

class UserController {

    static async getProfile(c: Context): Promise<void> {
        
        const payload = c.req.param('userId')
        const validationResult = getUserProfileSchema.safeParse({userId: payload})

        if (!validationResult.success) {
            throw validationResult.error
        }

        const userId = validationResult.data.userId

        const user = await UserService.getUserById(userId)
        c.json(user, 200);
    }

    static async updateProfile(c: Context): Promise<void> {

        const payload = c.req.json()
        const validationResult = updateProfileSchema.safeParse(payload)

        if (!validationResult.success) {
            throw validationResult.error
        }
        
        const updateProfileData = validationResult.data

        const updatedUser = await UserService.updateProfile(updateProfileData);
        c.json({
            updatedUser: updatedUser,
            message: "User profile updated successfully",
        }, 200)
    }

    static async getAuthProvider(c: Context): Promise<void> {

        const payload = c.req.param('userId')
        const validationResult = getAuthProviderSchema.safeParse({userId: payload})

        if (!validationResult.success) {
            throw validationResult.error
        }

        const userId = validationResult.data.userId

        const provider = await UserService.getAuthProvider(userId);
        c.json(provider, 200);

    }

    static async deleteProfile(c: Context): Promise<void> {

        const payload = c.req.json()
        const validationResult = deleteProfileSchema.safeParse(payload)

        if (!validationResult.success) {
            throw validationResult.error
        }

        const userId = validationResult.data.userId
    
        await UserService.deleteProfile(userId)
        c.json({
            message: 'Profile deleted successfully',
        }, 200);
    }

    static async handleReferral(c: Context): Promise<void> {

        const payload = c.req.json()
        const validationResult = handleReferralSchema.safeParse(payload)

        if (!validationResult.success) {
            throw validationResult.error
        }

        const referralCode = validationResult.data.referralCode
        const referredId = validationResult.data.referredId

        await UserService.handleReferral(referralCode, referredId)
        c.json({
            message: 'Referral handled successfully',
        }, 200);
        
    }

    static async getUserVouchers(c: Context): Promise<void> {

        const payload = c.req.json()
        const validationResult = getUserVouchersSchema.safeParse(payload)

        if (!validationResult.success) {
            throw validationResult.error
        }

        const userId = validationResult.data.userId
        const status = validationResult.data.status
        const page = validationResult.data.page
        const limit = validationResult.data.limit
        
        const result = await UserService.getUserById(userId);

        // Filter vouchers by status if provided
        let vouchers = result.vouchers;
        if (status) {
            vouchers = vouchers.filter((v: any) => v.status === status);
        }

        // Implement pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedVouchers = vouchers.slice(startIndex, endIndex);

        c.json({
            vouchers: paginatedVouchers,
            total: vouchers.length,
            page,
            limit
        }, 200);

    }

    static async updateVoucherStatus (c: Context): Promise<void> {

        const payload = c.req.json()
        const validationResult = updateVoucherStatusSchema.safeParse(payload)

        if (!validationResult.success) {
            throw validationResult.error
        }
        const voucherId = validationResult.data.voucherId

        await UserService.updateVoucherStatus(voucherId)

        c.json({
            message: "Voucher status updated successfully"
        }), 200
    }

    static async checkEmailAvailability(c: Context): Promise<void> {

        const payload = c.req.query('email')
        const validationResult = checkEmailAvailabilitySchema.safeParse({email: payload})

        if (!validationResult.success) {
            throw validationResult.error
        }

        const email = validationResult.data.email
        
        const available = await UserService.checkEmailExists(email);
        c.json({ 
            available: available 
        }, 200);
        
    }
}

export default UserController;