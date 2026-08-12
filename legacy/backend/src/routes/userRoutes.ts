import { Router } from "express";
import UserController from "../controllers/userController.js";

const userRouter = Router();

// Get user profile by ID (GET request with userId as URL parameter)
userRouter.get('/api/users/profile/:userId', UserController.getProfile.bind(UserController));

// Get user's auth provider (Google, email/password, etc.)
userRouter.get('/api/users/auth-provider/:userId', UserController.getAuthProvider.bind(UserController));

// Update user profile
userRouter.post('/api/user/update-profile', UserController.updateProfile.bind(UserController));

// delete user
userRouter.post('/api/user/delete-profile', UserController.deleteProfile.bind(UserController));

// handle referral user
userRouter.post('/api/user/referral', UserController.handleReferral.bind(UserController));

// Get user vouchers
userRouter.get('/api/users/:userId/vouchers', UserController.getUserVouchers.bind(UserController));

// update the status of the user's voucher/s
userRouter.post('/api/user/update-voucher', UserController.updateVoucherStatus.bind(UserController))

// Check email uniqueness
userRouter.get('/api/check-email', UserController.checkEmailAvailability.bind(UserController));

export default userRouter