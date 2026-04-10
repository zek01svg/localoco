import type {
  Business,
  BusinessReview,
  DayOfWeek,
  HourEntry,
  PaymentOption,
  PriceTier,
} from "@server/database/schema";

/**
 * Represents the search and filtering options for the business directory.
 */
export interface FilterOptions {
  search_query?: string;
  price_tier?: PriceTier | PriceTier[];
  business_category?: string | string[];
  newly_added?: boolean;
  open247?: boolean;
  offers_delivery?: boolean;
  offers_pickup?: boolean;
  payment_options?: PaymentOption[];
  sort_by?: "business_name" | "date_of_creation" | "price_tier";
  sort_order?: "asc" | "desc";
}

/**
 * HydratedBusiness Interface
 */
export interface HydratedBusiness extends Business {
  avgRating: number;
  openingHours: Record<DayOfWeek, HourEntry>;
  paymentOptions: PaymentOption[];
  reviews: (BusinessReview & { userName: string; userImage: string })[];
}
