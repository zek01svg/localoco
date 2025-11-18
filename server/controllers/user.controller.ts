import { Context } from "hono";
import UserService from "../services/user.service";
import { checkEmailAvailabilitySchema, deleteProfileSchema, getAuthProviderSchema, getUserProfileSchema, getUserVouchersSchema, handleReferralSchema, updateProfileSchema, updateVoucherStatusSchema } from "../../shared/zod-schemas/user.schema";

class UserController {

    /**
     * Retrieves a user's profile information by their ID.
     * @param {Context} c - The Hono context.
     * @throws {ZodError} If the userId parameter fails validation.
     * @returns {Promise<Response>} A JSON response with the user's profile data.
     */
    static async getProfile(c: Context): Promise<Response> {
        
        const payload = c.req.param('userId')
        const validationResult = getUserProfileSchema.safeParse({userId: payload})

        if (!validationResult.success) {
            throw validationResult.error
        }

        const userId = validationResult.data.userId

        const user = await UserService.getUserById(userId)
        return c.json(user, 200);
    }

    /**
     * Updates a user's profile information.
     * @param {Context} c - The Hono context.
     * @throws {ZodError} If the request body fails validation.
     * @returns {Promise<Response>} A JSON response with the updated user data and a success message.
     */
    static async updateProfile(c: Context): Promise<Response> {

        const payload = c.req.json()
        const validationResult = updateProfileSchema.safeParse(payload)

        if (!validationResult.success) {
            throw validationResult.error
        }
        
        const updateProfileData = validationResult.data

        const updatedUser = await UserService.updateProfile(updateProfileData);
        return c.json({
            updatedUser: updatedUser,
            message: "User profile updated successfully",
        }, 200)
    }

    /**
     * Retrieves the authentication provider (e.g., 'google', null) for a user.
     * @param {Context} c - The Hono context.
     * @throws {ZodError} If the userId parameter fails validation.
     * @returns {Promise<Response>} A JSON response with the provider ID.
     */
    static async getAuthProvider(c: Context): Promise<Response> {

        const payload = c.req.param('userId')
        const validationResult = getAuthProviderSchema.safeParse({userId: payload})

        if (!validationResult.success) {
            throw validationResult.error
        }

        const userId = validationResult.data.userId

        const provider = await UserService.getAuthProvider(userId);
        return c.json(provider, 200);

    }

    /**
     * Deletes a user's profile.
     * @param {Context} c - The Hono context.
     * @throws {ZodError} If the request body fails validation.
     * @returns {Promise<Response>} A JSON response with a success message.
     */
    static async deleteProfile(c: Context): Promise<Response> {

        const payload = c.req.json()
        const validationResult = deleteProfileSchema.safeParse(payload)

        if (!validationResult.success) {
            throw validationResult.error
        }

        const userId = validationResult.data.userId
    
        await UserService.deleteProfile(userId)
        return c.json({
            message: 'Profile deleted successfully',
        }, 200);
    }

    /**
     * Processes a new user referral.
     * @param {Context} c - The Hono context.
     * @throws {ZodError} If the request body fails validation.
     * @returns {Promise<Response>} A JSON response with a success message.
     */
    static async handleReferral(c: Context): Promise<Response> {

        const payload = c.req.json()
        const validationResult = handleReferralSchema.safeParse(payload)

        if (!validationResult.success) {
            throw validationResult.error
        }

        const referralCode = validationResult.data.referralCode
        const referredId = validationResult.data.referredId

        await UserService.handleReferral(referralCode, referredId)
        return c.json({
            message: 'Referral handled successfully',
        }, 200);
        
    }

    /**
     * Retrieves a paginated and optionally filtered list of a user's vouchers.
     * @param {Context} c - The Hono context.
     * @throws {ZodError} If the request body fails validation.
     * @returns {Promise<Response>} A JSON response with the paginated voucher data.
     */
    static async getUserVouchers(c: Context): Promise<Response> {

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

        return c.json({
            vouchers: paginatedVouchers,
            total: vouchers.length,
            page,
            limit
        }, 200);

    }

    /**
     * Updates the status of a specific voucher (e.g., to 'used').
     * @param {Context} c - The Hono context.
     * @throws {ZodError} If the request body fails validation.
     * @returns {Promise<Response>} A JSON response with a success message.
     */
    static async updateVoucherStatus (c: Context): Promise<Response> {

        const payload = c.req.json()
        const validationResult = updateVoucherStatusSchema.safeParse(payload)

        if (!validationResult.success) {
            throw validationResult.error
        }
        const voucherId = validationResult.data.voucherId

        await UserService.updateVoucherStatus(voucherId)

        return c.json({
            message: "Voucher status updated successfully"
        }, 200)
    }

    /**
     * Checks if an email address is already in use.
     * @param {Context} c - The Hono context.
     * @throws {ZodError} If the email query parameter fails validation.
     * @returns {Promise<Response>} A JSON response with a boolean 'available' property.
     */
    static async checkEmailAvailability(c: Context): Promise<Response> {

        const payload = c.req.query('email')
        const validationResult = checkEmailAvailabilitySchema.safeParse({email: payload})

        if (!validationResult.success) {
            throw validationResult.error
        }

        const email = validationResult.data.email
        
        const available = await UserService.checkEmailExists(email);
        return c.json({ 
            available: available 
        }, 200);
        
    }
}

export default UserController;