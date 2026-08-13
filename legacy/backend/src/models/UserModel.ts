import { User, UpdateProfileData } from '../types/User.js';
import db from '../database/db.js'
import { referrals, user, userPoints, vouchers, account, businessReviews } from '../database/schema.js';
import { and, or, ilike, eq, inArray, gte, sql, asc, desc } from 'drizzle-orm';
import { date } from 'better-auth';

class UserModel {

    /**
     * Retrieves a user record from the database by its unique ID.
     *
     * @param {string} userId - The unique identifier of the user.
     * @returns {Promise<User | null>} The `User` object corresponding to the ID, or `null` if not found.
     */
    public static async getUserById(userId: string) {
        try {
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
                const availablePoints = await db.select().from(userPoints).where(eq(userPoints.userEmail, profile[0].email))
                points = availablePoints[0]?.points || 0;

                // Fetch reviews using userEmail
                reviews = await db.select().from(businessReviews).where(eq(businessReviews.userEmail, profile[0].email))

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
                profile: profile[0] || null,
                vouchers: availableVouchers,
                points: points,
                reviews: reviews,
                successfulReferrals: successfulReferrals
            }
        }
        catch (error) {
            console.error(`❌ Error fetching user: ${userId}`, error);
            throw error;
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
    public static async updateProfile(userId: string, updates: UpdateProfileData) {
        try {
   
            // Update only the fields that are provided
            const updateData: any = {};
            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.email !== undefined) updateData.email = updates.email;
            if (updates.imageUrl !== undefined) updateData.image = updates.imageUrl;
            if (updates.bio !== undefined) updateData.bio = updates.bio;
            if (updates.hasBusiness !== undefined) updateData.hasBusiness = updates.hasBusiness;
            updateData.updatedAt = updates.updatedAt


            // Perform the update
            const updateResult = await db.update(user)
                .set(updateData)
                .where(eq(user.id, userId));


            // Fetch and return the updated user
            const updatedUser = await db.select().from(user).where(eq(user.id, userId)).limit(1);

            return updatedUser[0];
        } catch (error) {
            console.error('❌ Error updating profile in UserModel:', error);
            throw error;
        }
    }

    /**
     * Deletes a user record from the database by its unique ID.
     * 
     * Removes the user entry identified by `userId` from the `user` table. 
     * Any related data is assumed to be handled by database constraints or cascading rules.
     * 
     * @param {string} userId - The unique identifier of the user to delete.
     * @returns {Promise<void>} Resolves when the user record has been successfully removed.
     */
    public static async deleteProfile(userId: string) {
        try {
            await db.delete(user).where(eq(user.id, userId))
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }

    public static async handleReferral(referralCode: string, referredId: string) {
        try {

            // Check if referral code is valid
            const referrerResult = await db.select()
                .from(user)
                .where(eq(user.referralCode, referralCode));
            
            if (referrerResult.length === 0) {
                return false; // Code doesn't exist
            }

            const referrerUser = referrerResult[0]!;

            // Prevent self-referral
            if (referrerUser.id === referredId) {
                return false;
            }

            // Check if user (referredId) has already been referred
            const referredUserCheck = await db.select({ 
                    referredByUserID: user.referredByUserId 
                }).from(user).where(eq(user.id, referredId));

            if (referredUserCheck[0]?.referredByUserID) {
                return false;
            }

            // === 2. TRANSACTION (All writes) ===
            const transactionResult = await db.transaction(async (tx) => {
                
                const now = new Date();
                const expiryDate = new Date(now);
                expiryDate.setMonth(expiryDate.getMonth() + 1);
                
                // Insert the referral record
                const referralInsertResult = await tx.insert(referrals).values({
                    referrerId: referrerUser.id,
                    referredId: referredId,
                    referralCode,
                    status: "claimed",
                    referredAt: now.toISOString() // Use 'now' for consistency
                });
                
                const newReferralId = referralInsertResult[0].insertId;

                // Insert voucher for the REFERRED user
                await tx.insert(vouchers).values({
                    userId: referredId,
                    refId: newReferralId,
                    amount: 5,
                    status: 'issued',
                    issuedAt: now.toISOString(),
                    expiresAt: expiryDate.toISOString()
                });

                // Insert voucher for the REFERRER user
                await tx.insert(vouchers).values({
                    userId: referrerUser.id,
                    refId: newReferralId,
                    amount: 5,
                    status: 'issued',
                    issuedAt: now.toISOString(),
                    expiresAt: expiryDate.toISOString()
                });

                // update the new user referredByUserID column
                await tx.update(user).set({
                    referredByUserId: referrerUser.id,
                }).where(eq(user.id, referredId))

                return true;
            });
            
            return transactionResult; 
        } 
        catch (error) {

            console.error('Error handling referral:', error);
            throw error;
        }
    }

    /**
     * Gets the authentication provider for a user (e.g., 'google', 'email', null).
     *
     * @param {string} userId - The unique identifier of the user.
     * @returns {Promise<string | null>} The provider ID ('google', 'facebook', etc.) or null for email/password users.
     */
    public static async getAuthProvider(userId: string): Promise<string | null> {
        try {

            // Check if user has any OAuth account linked (Google, Facebook, etc.)
            const accounts = await db
                .select()
                .from(account)
                .where(eq(account.userId, userId))
                .limit(1);


            if (accounts.length > 0 && accounts[0]) {
                // User has an OAuth account, return the provider
                return accounts[0].providerId || null;
            }

            // No OAuth account found, user signed up with email/password
            return null;
        } catch (error) {
            console.error('❌ Error checking auth provider:', error);
            throw error;
        }
    }

    public static async updateVoucherStatus (voucherId:number) {
        await db.update(vouchers).set({status:'used'}).where(eq(vouchers.voucherId, voucherId))
    }

    public static async checkEmailExists(email: string): Promise<boolean> {
        try {
            const users = await db.select().from(user).where(eq(user.email, email)).limit(1);
            return users.length > 0;
        } catch (error) {
            console.error('Error checking email:', error);
            throw error;
        }
    }
}

export default UserModel