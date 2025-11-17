import { Business } from "./business";
import { BookmarkedBusiness } from "./business";

export interface BusinessFilters {
    searchTerm: string;
    selectedCategories: string[];
    selectedPrices: string[];
    openNowOnly: boolean;
}

export interface BusinessState {
    businesses: Business[];
    selectedBusiness: Business | null;
    bookmarkedBusinesses: BookmarkedBusiness[];
    filters: BusinessFilters;
    isLoading: boolean;
    error: string | null;
}

export interface BusinessActions {
    setBusinesses: (businesses: Business[]) => void;
    setSelectedBusiness: (business: Business | null) => void;
    setBookmarks: (bookmarks: BookmarkedBusiness[]) => void;
    toggleBookmark: (businessId: string) => void;
    isBookmarked: (businessId: string) => boolean;
    setFilters: (filters: Partial<BusinessFilters>) => void;
    resetFilters: () => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
}

export type BusinessStore = BusinessState & BusinessActions;
