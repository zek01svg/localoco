export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
export type PriceTier = 'low' | 'medium' | 'high';
export type PaymentOption = 'cash' | 'card' | 'paynow' | 'digital_wallets'
export interface HourEntry {
    open: string; 
    close: string; 
}

export interface BusinessPaymentOption {
    uen: string;
    paymentOption: PaymentOption;
}

export interface Business {
    ownerId: string,
    uen: string; 
    businessName: string;
    businessCategory: string;
    description: string;
    address: string;
    avgRating: number;
    latitude: string;
    longitude: string;
    open247: boolean; 
    openingHours: Record<DayOfWeek, HourEntry>; 
    email: string | null;
    phoneNumber: string | null;
    websiteUrl: string | null; 
    socialMediaUrl: string | null; 
    wallpaperUrl: string; 
    createdAt: string; 
    updatedAt: string | null; 
    priceTier: PriceTier;
    offersDelivery: boolean;
    offersPickup: boolean;
    paymentOptions: PaymentOption[] | string[];
}
export interface FilterOptions {
    search_query?: string | undefined;
    price_tier?: PriceTier | PriceTier[] | undefined;
    business_category?: string | string[] | undefined;
    newly_added?: boolean | undefined;
    open247?: boolean | undefined;
    offers_delivery?: boolean | undefined;
    offers_pickup?: boolean | undefined;
    payment_options?: PaymentOption[] | undefined;
    sort_by?: 'business_name' | 'date_of_creation' | 'price_tier' | undefined;
    sort_order?: 'asc' | 'desc' | undefined;
}