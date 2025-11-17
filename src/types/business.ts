// src/types/business.ts

export type BusinessCategory =
    | "all"
    | "fnb"
    | "retail"
    | "services"
    | "entertainment"
    | "health_wellness"
    | "professional_services"
    | "home_living";

export interface Business {
    uen: string; // from uen
    name: string; // from businessName
    category: BusinessCategory; // from businessCategory
    subcategory?: string;

    address: string;
    phone: string; // from phoneNumber
    email: string; // from businessEmail
    website?: string; // from websiteLink
    socialMedia?: string; // from socialMediaLink
    description: string;
    image: string; // from wallpaper

    dateOfCreation?: string; // from dateOfCreation
    avgRating?: number;

    rating?: number; // optional if backend provides
    reviewCount?: number; // optional if backend provides

    priceRange: "low" | "medium" | "high" | "$" | "$$" | "$$$" | "$$$$"; // from priceTier

    open247: boolean; // from open247
    hours: {
        [day: string]: {
            open: string;
            close: string;
        };
    }; // from openingHours
    operatingDays: string[]; // ✅ Added

    // Add direct lat/lng properties
    lat?: number;
    lng?: number;

    // Keep coordinates for backward compatibility
    coordinates?: {
        lat: number;
        lng: number;
    };

    offersDelivery: boolean; // from offersDelivery
    offersPickup: boolean; // from offersPickup
    paymentOptions: string[]; // from paymentOptions

    isPopular?: boolean;
    tags?: string[];
}

export interface BackendBusiness {
    uen: string;
    businessName: string;
    businessCategory: string;
    description: string;
    address: string;
    phoneNumber: string;
    websiteLink?: string;
    wallpaper: string;
    priceTier: string;
    operatingDays: string[]; // ✅ Added
    open247: boolean;
    openingHours: { [day: string]: { open: string; close: string } };
    offersDelivery?: boolean;
    offersPickup?: boolean;
    paymentOptions?: string[];
    avgRating: number;
    reviewCount: number;
}

// Missing interface added here
export interface BookmarkedBusiness {
    businessId: string;
    dateBookmarked: string;
}

export interface Review {
    id: string;
    businessId: string;
    userId?: string; // Make optional with ?
    userName: string;
    userAvatar?: string; // Make optional with ?
    rating: number;
    comment: string;
    date: string;
}

export interface Event {
    id: string;
    title: string;
    description: string;
    businessId?: string;
    businessName?: string;
    date: string;
    image?: string;
    isLatest?: boolean;
}

export interface OpenStatus {
    isOpen: boolean;
    nextChange?: string;
    closingSoon?: boolean;
}
