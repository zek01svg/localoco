import { Request, Response, NextFunction } from "express";
import UserModel from "../models/UserModel.js";

class UserController {

    // Get user profile by ID from URL parameter
    static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = String(req.params.userId);

            if (!userId) {
                res.status(400).json({ error: 'User ID is required' });
                return;
            }

            const user = await UserModel.getUserById(userId);

            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            res.status(200).json(user);

        } catch (error) {
            console.error('Error fetching profile:', error);
            res.status(500).json({ error: 'Failed to fetch profile' });
        }
    }

    // Update user profile
    static async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {


            const { userId, name, email, imageUrl, bio, hasBusiness } = req.body;


            if (!userId) {
                res.status(400).json({ error: 'User ID is required' });
                process.exit(1)
            }

            // Prepare update data
            const updates: any = {};
            if (name !== undefined) updates.name = name;
            if (email !== undefined) updates.email = email;
            if (imageUrl !== undefined) updates.imageUrl = imageUrl;
            if (bio !== undefined) updates.bio = bio;
            if (hasBusiness !== undefined) updates.hasBusiness = hasBusiness;
            updates.updatedAt = new Date()


            const updatedUser = await UserModel.updateProfile(userId, updates);

            if (!updatedUser) {
                res.status(404).json({ error: 'User not found after update' });
                return;
            }

            res.status(200).json(updatedUser)
        } catch (error: any) {
            if (error.message === 'User not found') {
                res.status(404).json({ error: 'User not found' });
            } else {
                console.error('❌ Error updating profile:', error);
                res.status(500).json({ error: 'Failed to update profile' });
            }
        }
    }

    // Get user's auth provider (check if they use Google, email/password, etc.)
    static async getAuthProvider(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = String(req.params.userId);

            if (!userId) {
                res.status(400).json({ error: 'User ID is required' });
                return;
            }

            const provider = await UserModel.getAuthProvider(userId);

            res.status(200).json({ provider });

        } catch (error) {
            console.error('Error checking auth provider:', error);
            res.status(500).json({ error: 'Failed to check auth provider' });
        }
    }

    // delete user profile
    static async deleteProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.body.userId

            if (!userId) {
                res.status(400).json({ error: 'User ID is required' });
                return;
            }

            await UserModel.deleteProfile(userId)

            res.status(200).json({
                message: 'Profile deleted successfully',
            });
        } 
        catch (error: any) {
            console.log(`Error deleting profile: ${error}`)
        }
    }

    // handle referrals
    static async handleReferral(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const referralCode = req.body.referralCode
            const referredId = req.body.referredId

            if (!referralCode || !referredId) {
                res.status(400).json({
                    message: 'Referral code and user ID are required',
                });
                return;
            }

            const result = await UserModel.handleReferral(referralCode, referredId)

            if (result === false) {
                res.status(400).json({
                    message: 'Invalid referral code or already used',
                });
                return;
            }

            res.status(200).json({
                message: 'Referral handled successfully',
                success: true
            });

        }
        catch (error: any) {
            console.error(`Error handling referral:`, error);
            res.status(500).json({
                message: 'Server error processing referral',
            });
        }
    }

    // Get user vouchers
    static async getUserVouchers(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = String(req.params.userId);
            const status = req.query.status as string | undefined;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 100;


            if (!userId) {
                res.status(400).json({ error: 'User ID is required' });
                return;
            }

            const result = await UserModel.getUserById(userId);

            if (!result || !result.profile) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            // Filter vouchers by status if provided
            let vouchers = result.vouchers;
            if (status) {
                vouchers = vouchers.filter((v: any) => v.status === status);
            }

            // Implement pagination
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedVouchers = vouchers.slice(startIndex, endIndex);

            res.status(200).json({
                vouchers: paginatedVouchers,
                total: vouchers.length,
                page,
                limit
            });

        } catch (error) {
            console.error('Error fetching vouchers:', error);
            res.status(500).json({ error: 'Failed to fetch vouchers' });
        }
    }

    static async updateVoucherStatus (req: Request, res: Response, next: NextFunction): Promise<void> {
        const voucherId = Number(req.body.voucherId)
        if (!voucherId) {
            throw new Error('voucher id not specified')
        }

        try {
            await UserModel.updateVoucherStatus(voucherId)
        }
        catch (err:any) {
            throw new Error('cannot update voucher status')
        }
    }

    static async checkEmailAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const email = String(req.query.email || '');
            if (!email) {
                res.status(400).json({ error: 'Email is required' });
                return;
            }

            const exists = await UserModel.checkEmailExists(email);
            res.json({ available: !exists });
        } catch (error) {
            console.error('Error checking email:', error);
            next(error);
        }
    }
}

export default UserController;