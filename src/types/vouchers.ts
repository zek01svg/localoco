export interface Voucher {
    id: string;
    title: string;
    description: string;
    discountAmount: number; // in dollars
    pointsCost: number;
    category: "discount" | "percentage" | "freebie";
    percentageOff?: number; // if category is percentage
    minSpend?: number; // minimum spend required
    expiryDays: number; // days until expiry after redemption
    icon: string;
    color: string;
    isPopular?: boolean;
}

export interface RedeemedVoucher {
    id: string;
    voucherId: string;
    voucher: Voucher;
    redemptionDate: string;
    expiryDate: string;
    code: string;
    isUsed: boolean;
    usedDate?: string;
    businessUsedAt?: string;
}