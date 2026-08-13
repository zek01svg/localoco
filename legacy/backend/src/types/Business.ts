export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface HourEntry {
    open: string; 
    close: string; 
}

export interface BusinessPaymentOption {
    uen: string;
    paymentOption: string;
}

export interface Business {
    ownerId: string,
    uen: string; 
    businessName: string;
    businessCategory: string;
    description: string;
    address: string;
    latitude: string | null;
    longitude: string | null;
    open247: boolean | number; 
    openingHours: Record<DayOfWeek, HourEntry>; 
    email: string;
    phoneNumber: string;
    websiteLink: string | null; 
    socialMediaLink: string | null; 
    wallpaper: string; 
    dateOfCreation: string; 
    priceTier: string;
    offersDelivery: boolean | number;
    offersPickup: boolean | number;
    paymentOptions: string[];
}

export type PriceTier = 'low' | 'medium' | 'high';

export interface FilterOptions {
    search_query?: string;
    price_tier?: PriceTier | PriceTier[]
    business_category?: string | string[];
    newly_added?: boolean;
    open247?: boolean;
    offers_delivery?: boolean;
    offers_pickup?: boolean;
    payment_options?: string[]; 
    sort_by?: 'business_name' | 'date_of_creation' | 'price_tier';
    sort_order?: 'asc' | 'desc';
}

export interface BusinessToBeUpdated {
    ownerID: string,
    uen: string,
    businessName: string,
    businessCategory: string,
    description: string,
    address: string,
    latitude: string,
    longitude: string,
    open247: number,
    openingHours: Record<DayOfWeek, HourEntry>,
    email: string,
    phoneNumber: string,
    websiteLink: string,
    socialMediaLink: string,
    wallpaper: string,
    priceTier: PriceTier,
    offersDelivery: number,
    offersPickup: number,
    paymentOptions: string[]
            
}

export interface BusinessForBusinessList {
    ownerId: string,
    uen: string; 
    businessName: string;
    businessCategory: string;
    description: string;
    avgRating: number;
    address: string;
    latitude: string | null;
    longitude: string | null;
    open247: boolean | number; 
    openingHours: Record<DayOfWeek, HourEntry>; 
    email: string;
    phoneNumber: string;
    websiteLink: string | null; 
    socialMediaLink: string | null; 
    wallpaper: string; 
    dateOfCreation: string; 
    priceTier: string;
    offersDelivery: boolean | number;
    offersPickup: boolean | number;
    paymentOptions: string[];
}