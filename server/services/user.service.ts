import checkDbResult from 'server/utils/check-db-result';
import { User } from '../../shared/types/user.types';
import db from '../database/db'
import { referrals, user, userPoints, vouchers, account, businessReviews } from '../database/schema';
import { and, eq } from 'drizzle-orm';

class UserService {

    /**
     * Retrieves a user record from the database by its unique ID.
     *
     * @param {string} userId - The unique identifier of the user.
     * @returns {Promise<Object>} The `User` object corresponding to the ID, or `null` if not found.
     */
    public static async getUserById(userId: string) {
        const profile = await db.select().from(user).where(eq(user.id, userId))

        // Fetch vouchers with referral code (join with referrals table)
        const availableVouchers = await db
            .select({
                id: vouchers.voucherId,
                userId: vouchers.userId,
                refId: vouchers.refId,
                amount: vouchers.amount,
                status: vouchers.status,
                issuedAt: vouchers.issuedAt,
                expiresAt: vouchers.expiresAt,
                referralCode: referrals.referralCode
            })
            .from(vouchers)
            .leftJoin(referrals, eq(referrals.refId, vouchers.refId))
            .where(eq(vouchers.userId, userId));


        // Fetch user points and reviews if profile exists
        let points = 0;
        let reviews: any[] = [];
        let successfulReferrals = 0;
        if (profile[0]) {
            const availablePoints = await db.select().from(userPoints).where(eq(userPoints.email, profile[0].email))
            points = availablePoints[0]?.points || 0;

            // Fetch reviews using userEmail
            reviews = await db.select().from(businessReviews).where(eq(businessReviews.email, profile[0].email))

            // Count successful referrals (where this user is the referrer and status is 'claimed')
            const successfulReferralsResult = await db
                .select()
                .from(referrals)
                .where(and(
                    eq(referrals.referrerId, userId),
                    eq(referrals.status, 'claimed')
                ));

            successfulReferrals = successfulReferralsResult.length;
        }

        return {
            profile: profile[0],
            vouchers: availableVouchers,
            points: points,
            reviews: reviews,
            successfulReferrals: successfulReferrals
        }
    }

    /**
     * Updates the profile information of a user in the database.
     *
     * Accepts partial updates for the user's `name`, `email`, and `image`.
     * Only the fields provided in `updates` are modified, leaving other fields unchanged.
     *
     * @param {string} userId - The unique identifier of the user to update.
     * @param {UpdateProfileData} updates - Object containing the profile fields to update.
     * @returns {Promise<User>} The updated `User` object reflecting the changes.
     */
    public static async updateProfile(updateProfileData:Omit<User, 'createdAt' | 'updatedAt' | 'referralCode' | 'referredByUserId'>) {

        await db.update(user)
            .set(updateProfileData)
            .where(eq(user.id, updateProfileData.userId));

        // fetch and return the updated user
        const updatedUser = await db.select().from(user).where(eq(user.id, updateProfileData.userId))

        return updatedUser[0];
    }

    /**
     * Deletes a user record from the database by its unique ID.
     * @param {string} userId - The unique identifier of the user to delete.
     * @returns {Promise<void>} Resolves on success.
     * @throws {Error} Throws an error if the database deletion fails.
     */
    public static async deleteProfile(userId: string):Promise<void | Error> {
        const rawResult = await db.delete(user).where(eq(user.id, userId))
        if (!checkDbResult(rawResult)) {
            throw new Error('Failed to delete user profile')
        }
    }

    /**
     * Handles a new user referral within a transaction.
     * Issues vouchers to both the referrer and the referred user.
     *
     * @param {string} referralCode - The referrer's unique code.
     * @param {string} referredId - The new user's ID.
     * @returns {Promise<void>} Resolves on success.
     * @throws {Error} Throws an error if the transaction or any of the checks fail.
     */
    public static async handleReferral(referralCode: string, referredId: string):Promise <void | Error> {

        // Check if referral code is valid
        const referrerResult = await db.select()
            .from(user)
            .where(eq(user.referralCode, referralCode));
        
        if (referrerResult.length === 0) {
            throw new Error('Referral code is invalid')
        }

        const referrerUser = referrerResult[0]!;

        // Prevent self-referral
        if (referrerUser.id === referredId) {
           throw new Error('Self-referral is not allowed')
        }

        // Check if user (referredId) has already been referred
        const referredUserCheck = await db.select({ 
                referredByUserID: user.referredByUserId 
            }).from(user).where(eq(user.id, referredId));

        if (referredUserCheck[0]?.referredByUserID) {
            throw new Error('User has already been referred')
        }

        // if all checks above pass, handle the referral 
        await db.transaction(async (tx) => {
            
            const now = new Date();
            const expiryDate = new Date(now);
            expiryDate.setMonth(expiryDate.getMonth() + 1);
            
            // Insert the referral record
            const referralInsertResult = await tx.insert(referrals).values({
                referrerId: referrerUser.id,
                referredId: referredId,
                referralCode,
                status: "claimed",
                referredAt: now.toISOString() 
            });

            if (!checkDbResult(referralInsertResult)) {
                throw new Error('Failed to insert referral')
            }
            
            const newReferralId = referralInsertResult[0].insertId;

            // Insert voucher for the REFERRED user
            const referredInsertResult = await tx.insert(vouchers).values({
                userId: referredId,
                refId: newReferralId,
                amount: 5,
                status: 'issued',
                issuedAt: now.toISOString(),
                expiresAt: expiryDate.toISOString()
            });

            if (!checkDbResult(referredInsertResult)) {
                throw new Error('Failed to insert voucher for the referred user')
            }

            // Insert voucher for the REFERRER
            const referrerInsertResult = await tx.insert(vouchers).values({
                userId: referrerUser.id,
                refId: newReferralId,
                amount: 5,
                status: 'issued',
                issuedAt: now.toISOString(),
                expiresAt: expiryDate.toISOString()
            });

            if (!checkDbResult(referrerInsertResult)) {
                throw new Error('Failed to insert voucher for the referrer')
            }

            // update the new user referredByUserID column
            const updateReferredByUserIdResult = await tx.update(user).set({
                referredByUserId: referrerUser.id,
            }).where(eq(user.id, referredId))

            if (!checkDbResult(updateReferredByUserIdResult)) {
                throw new Error('Failed to insert voucher for the referred user')
            }
        });
    }

    /**
     * Gets the authentication provider for a user (e.g., 'google', 'email', null).
     *
     * @param {string} userId - The unique identifier of the user.
     * @returns {Promise<string | null>} The provider ID ('google', 'facebook', etc.) or null for email/password users.
     */
    public static async getAuthProvider(userId: string): Promise<string | null> {

        // Check if user has any OAuth account linked (Google, Facebook, etc.)
        const accounts = await db
            .select()
            .from(account)
            .where(eq(account.userId, userId))

        if (accounts.length > 0 && accounts[0]) {
            // User has an OAuth account, return the provider
            return accounts[0].providerId;
        }

        // No OAuth account found, user signed up with email/password
        return null;
    }

    /**
     * Updates a voucher's status to 'used'.
     *
     * @param {number} voucherId - The ID of the voucher to update.
     * @returns {Promise<void>} Resolves on success.
     * @throws {Error} Throws an error if the database update fails.
     */
    public static async updateVoucherStatus (voucherId:number):Promise<void | Error> {
        const rawResult = await db.update(vouchers).set({status:'used'}).where(eq(vouchers.voucherId, voucherId))
        if (!checkDbResult(rawResult)) {
            throw new Error('Failed to update voucher status')
        }
    }

    /**
     * Checks if an email address already exists in the user table.
     *
     * @param {string} email - The email address to check.
     * @returns {Promise<boolean>} A promise that resolves to `true` if the email exists, or `false` otherwise.
     */
    public static async checkEmailExists(email: string): Promise<boolean> {
        const users = await db.select().from(user).where(eq(user.email, email))
        return users.length > 0;
    }
}

export default UserService;