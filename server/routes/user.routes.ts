import { Hono } from "hono";
import UserController from "../controllers/user.controller";
import protectRoute from "../middleware/protect-route";

const userRouter = new Hono() 

// get user profile by ID
userRouter.get('/profile/:userId', protectRoute, UserController.getProfile);

// get user's auth provider (Google, email/password, etc.)
userRouter.get('/auth-provider/:userId', protectRoute, UserController.getAuthProvider);

// update user profile
userRouter.put('/update-profile', protectRoute, UserController.updateProfile);

// delete user
userRouter.delete('/delete-profile', protectRoute, UserController.deleteProfile);

// handle referral user
userRouter.post('/referral', UserController.handleReferral);

// Get user vouchers
userRouter.get('/:userId/vouchers', UserController.getUserVouchers);

// update the status of the user's voucher/s
userRouter.put('/update-voucher', UserController.updateVoucherStatus)

// Check email uniqueness
userRouter.get('/check-email', UserController.checkEmailAvailability);

export default userRouter