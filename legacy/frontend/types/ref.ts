import axios from "axios";
import { url } from "../constants/url";

export const API_BASE = `${url}/api`;

// Note: signup and login are now handled by better-auth
// Use the auth-client instead:
// import { signUp, signIn } from '../lib/auth-client';

export async function signup(payload: {
  email: string;
  password: string;
  name?: string;
  referralCode?: string;
}) {
  console.warn('signup() in ref.ts is deprecated. Use signUp from auth-client instead.');
  const res = await axios.post(`${API_BASE}/auth/sign-up/email`, payload, {
    headers: { "Content-Type": "application/json" },
    withCredentials: true,
  });
  return res.data;
}

export async function login(payload: {
  email: string;
  password: string;
}) {
  console.warn('login() in ref.ts is deprecated. Use signIn from auth-client instead.');
  const res = await axios.post(`${API_BASE}/auth/sign-in/email`, payload, {
    headers: { "Content-Type": "application/json" },
    withCredentials: true,
  });
  return res.data;
}

export async function getReferralInfo(userId: number | string) {
  // Fetch user profile (includes referralCode)
  const profileRes = await axios.get(`${API_BASE}/users/profile/${userId}`, {
    withCredentials: true,
  });

  // Fetch vouchers for this user to calculate total amount
  const vouchersRes = await axios.get(`${API_BASE}/users/${userId}/vouchers`, {
    params: { status: 'issued', limit: 1000 }, // Get all issued vouchers
    withCredentials: true,
  });

  const vouchers = vouchersRes.data.vouchers || [];
  const totalAmount = vouchers.reduce((sum: number, v: any) => sum + (v.amount || 0), 0);

  // Extract profile data (response has nested structure)
  const profile = profileRes.data.profile || profileRes.data;
  const successfulReferrals = profileRes.data.stats?.successfulReferrals || 0; // ✅ Adjusted for new shape

  return {
    referralCode: profile.referralCode || '',
    userId: profile.id,
    name: profile.name,
    email: profile.email,
    successfulReferrals,
    vouchers: {
      totalAmount
    }
  };
}

export async function getVouchers({
  userId,
  page = 1,
  limit = 100,
  status,
}: { userId: number | string; page?: number; limit?: number; status?: 'issued'|'used'|'expired'|'revoked'; }) {
  const res = await axios.get(`${API_BASE}/users/${userId}/vouchers`, {
    params: { page, limit, status },
    withCredentials: true,
  });
  return res.data;
}

// ✅ --- ADD THIS NEW FUNCTION --- ✅
// This is the missing piece. It sends the redemption request to your backend.
export async function redeemVoucherOnBackend(payload: {
  userId: number | string;
  voucherId: string;
  pointsCost: number;
}) {
  // This POST request will hit the new endpoint we are creating on the backend.
  // Using a verb like "redeem" in the path is common and acceptable for actions.
  const res = await axios.post(`${API_BASE}/vouchers/redeem`, {
    userId: payload.userId,
    voucherId: payload.voucherId,
    pointsCost: payload.pointsCost,
  }, {
    withCredentials: true,
  });

  return res.data;
}
