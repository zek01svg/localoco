import axios from "axios";

export async function signup(payload: {
    email: string;
    password: string;
    name?: string;
    referralCode?: string;
}) {
    console.warn(
        "signup() in ref.ts is deprecated. Use signUp from auth-client instead.",
    );
    const res = await axios.post(`/api/auth/sign-up/email`, payload, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
    });
    return res.data;
}

export async function login(payload: { email: string; password: string }) {
    console.warn(
        "login() in ref.ts is deprecated. Use signIn from auth-client instead.",
    );
    const res = await axios.post(`/api/auth/sign-in/email`, payload, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
    });
    return res.data;
}

export async function getReferralInfo(userId: number | string) {
    // Fetch user profile (includes referralCode)
    const profileRes = await axios.get(`/api/users/profile/${userId}`, {
        withCredentials: true,
    });

    // Fetch vouchers for this user to calculate total amount
    const vouchersRes = await axios.get(
        `/api/users/${userId}/vouchers`,
        {
            params: { status: "issued", limit: 1000 }, // Get all issued vouchers
            withCredentials: true,
        },
    );

    const vouchers = vouchersRes.data.vouchers || [];
    const totalAmount = vouchers.reduce(
        (sum: number, v: any) => sum + (v.amount || 0),
        0,
    );

    const profile = profileRes.data.profile || profileRes.data;
    const successfulReferrals = profileRes.data.stats?.successfulReferrals || 0;

    return {
        referralCode: profile.referralCode || "",
        userId: profile.id,
        name: profile.name,
        email: profile.email,
        successfulReferrals,
        vouchers: {
            totalAmount,
        },
    };
}

export async function getVouchers({
    userId,
    page = 1,
    limit = 100,
    status,
}: {
    userId: number | string;
    page?: number;
    limit?: number;
    status?: "issued" | "used" | "expired" | "revoked";
}) {
    const res = await axios.get(`/api/users/${userId}/vouchers`, {
        params: { page, limit, status },
        withCredentials: true,
    });
    return res.data;
}

export async function redeemVoucherOnBackend(payload: {
    userId: number | string;
    voucherId: string;
    pointsCost: number;
}) {
    const res = await axios.post(
        `/api/vouchers/redeem`,
        {
            userId: payload.userId,
            voucherId: payload.voucherId,
            pointsCost: payload.pointsCost,
        },
        {
            withCredentials: true,
        },
    );

    return res.data;
}