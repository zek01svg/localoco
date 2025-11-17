import React from "react";
import { getReferralInfo } from "../../types/ref";

type Props = {
    userId: number | string; // from your auth state
    appBaseUrl?: string;
};

export default function ReferralPanel({
    userId,
    appBaseUrl = "https://localoco-wad-ii.azurewebsites.net",
}: Props) {
    const [loading, setLoading] = React.useState(true);
    const [code, setCode] = React.useState("");
    const [count, setCount] = React.useState(0);
    const [totalAmt, setTotalAmt] = React.useState(0);

    React.useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const data = await getReferralInfo(userId);
                setCode(data.referralCode);
                setCount(data.successfulReferrals);
                setTotalAmt(data.vouchers.totalAmount);
            } catch (error) {
                console.error("Error loading referral info:", error);
            } finally {
                setLoading(false);
            }
        })();
    }, [userId]);

    const shareUrl = `${appBaseUrl}/signup?ref=${code}`;

    if (loading) return <div>Loading referral info…</div>;

    return (
        <div className="rounded-2xl border p-4 space-y-3">
            <div className="text-lg font-semibold">
                Invite friends · Get rewards
            </div>
            <div className="text-sm">
                Your code: <b>{code}</b>
            </div>
            <div className="flex gap-2">
                <input
                    className="border rounded p-2 flex-1"
                    value={shareUrl}
                    readOnly
                />
                <button
                    className="px-3 py-2 rounded bg-black text-white"
                    onClick={() => navigator.clipboard.writeText(shareUrl)}
                >
                    Copy link
                </button>
            </div>
            <div className="text-sm">
                Successful referrals: <b>{count}</b>
                <br />
                Vouchers earned (total): <b>${totalAmt.toFixed(2)}</b>
            </div>
            <p className="text-xs text-gray-600">
                Rewards: Earn a $5 voucher by referring a friend! Refer more
                than 5 friends and get a $10 voucher!
            </p>
        </div>
    );
}
