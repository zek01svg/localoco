import { Business, OpenStatus, BusinessCategory } from "../types/business";

// Transform backend business data shape into frontend Business interface
export interface BackendBusiness {
    uen: string;
    businessName: string;
    businessCategory: string;
    description: string;
    address: string;
    avgRating: number;
    reviewCount: number;
    phoneNumber: string;
    email?: string;
    websiteLink?: string;
    wallpaper: string;
    priceTier: string;
    open247?: boolean;
    openingHours: {
        [day: string]: {
            open: string;
            close: string;
        };
    };
    offersDelivery?: boolean;
    offersPickup?: boolean;
    paymentOptions?: string[];
}

// Map backend category to frontend BusinessCategory
const categoryMap: Record<string, BusinessCategory> = {
    all: "all",
    fnb: "fnb",
    retail: "retail",
    services: "services",
    entertainment: "entertainment",
    health_wellness: "health-wellness", // maps underscore to dash
    "professional-services": "professional-services",
    "home-living": "home-living",
};

// Map backend priceTier to frontend priceRange (as symbols)
const priceTierMap: Record<string, Business["priceRange"]> = {
    low: "$",
    medium: "$$",
    high: "$$$",
};

/**
 * Transform raw backend business data to frontend Business interface
 */
export function transformBackendToBusiness(backend: BackendBusiness): Business {
    return {
        uen: backend.uen, // Add uen field
        id: backend.uen,
        name: backend.businessName,
        category: categoryMap[backend.businessCategory] || "services", // fallback category
        description: backend.description,
        address: backend.address,
        phone: backend.phoneNumber,
        email: backend.email || "", // Add email field
        website: backend.websiteLink,
        image: backend.wallpaper,
        priceRange: priceTierMap[backend.priceTier] || "medium",
        hours: backend.openingHours,
        open247: backend.open247 || false, // Add open247 field
        offersDelivery: backend.offersDelivery || false,
        offersPickup: backend.offersPickup || false,
        paymentOptions: backend.paymentOptions || [],
        avgRating: backend.avgRating,
        reviewCount: backend.reviewCount,
        coordinates: undefined, // supply if available
    };
}

export const getCategoryDisplayName = (category: string): string => {
    const categoryMap: { [key: string]: string } = {
        all: "All Categories",
        fnb: "Food & Beverage",
        retail: "Retail",
        services: "Services",
        entertainment: "Entertainment",
        "health-wellness": "Health & Wellness",
        "professional-services": "Professional Services",
        "home-living": "Home & Living",
    };
    return categoryMap[category] || category;
};

/**
 * Checks if a business is currently open based on local time and hours object.
 * Expects business.hours in format:
 * {
 *   Monday: { open: "07:00:00", close: "19:00:00" },
 *   ...
 * }
 */
export const checkBusinessOpenStatus = (business: Business): OpenStatus => {
    const now = new Date();
    const currentDay = now.toLocaleDateString("en-US", { weekday: "long" });
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const todayHours = business.hours?.[currentDay];

    // Check if hours data doesn't exist
    if (!todayHours) {
        return { isOpen: false, nextChange: "Opens tomorrow" };
    }

    // Check if it's a string (like "Closed")
    if (typeof todayHours === "string") {
        return { isOpen: false, nextChange: "Opens tomorrow" };
    }

    // ✅ Now it's an object - use type assertion and check properties
    const hoursObj = todayHours as { open: string; close: string };

    // Check if open or close properties are missing or "Closed"
    if (!hoursObj.open || !hoursObj.close) {
        return { isOpen: false, nextChange: "Opens tomorrow" };
    }

    // ✅ Safe to use toLowerCase now with explicit checks
    const openStr = String(hoursObj.open);
    const closeStr = String(hoursObj.close);

    if (
        openStr.toLowerCase() === "closed" ||
        closeStr.toLowerCase() === "closed"
    ) {
        return { isOpen: false, nextChange: "Opens tomorrow" };
    }

    // Convert times to minutes
    const toMinutes = (timeStr: string) => {
        const [hourStr, minStr] = timeStr.split(":");
        return parseInt(hourStr, 10) * 60 + parseInt(minStr, 10);
    };

    const openTime = toMinutes(openStr);
    const closeTime = toMinutes(closeStr);

    const isOpen = currentTime >= openTime && currentTime <= closeTime;
    const closingSoon = isOpen && closeTime - currentTime <= 60;

    const formatTime = (minutes: number) => {
        let h = Math.floor(minutes / 60);
        let m = minutes % 60;
        const ampm = h >= 12 ? "PM" : "AM";
        h = h % 12;
        if (h === 0) h = 12;
        return `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
    };

    let nextChange = "";
    if (isOpen) {
        nextChange = `Closes at ${formatTime(closeTime)}`;
    } else {
        nextChange = `Opens at ${formatTime(openTime)}`;
    }

    return { isOpen, nextChange, closingSoon };
};
