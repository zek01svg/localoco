import { businesses } from "@server/database/schema";
import type {
  FilterOptions,
  HydratedBusiness,
} from "@shared/types/business.types";
import { eq, gte, ilike, inArray, or, sql } from "drizzle-orm";

export function _hydrate(raw: any): HydratedBusiness {
  const reviews = (raw.businessReviews || []).map((r: any) => ({
    ...r,
    userName: r.user?.name || "Anonymous",
    userImage: r.user?.image || "",
  }));

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((acc: number, r: any) => acc + r.rating, 0) /
        reviews.length
      : 0;

  const openingHours: any = {};
  (raw.businessOpeningHours || []).forEach((h: any) => {
    openingHours[h.dayOfWeek] = { open: h.openTime, close: h.closeTime };
  });

  return {
    ...raw,
    avgRating,
    reviews,
    paymentOptions: (raw.businessPaymentOptions || []).map(
      (p: any) => p.paymentOption
    ),
    openingHours,
  };
}

export function _buildFilterConditions(filters: FilterOptions): any[] {
  const conditions: any[] = [];

  if (filters.search_query) {
    const searchPattern = `%${filters.search_query}%`;
    conditions.push(
      or(
        ilike(businesses.businessName, searchPattern),
        ilike(businesses.description, searchPattern)
      )
    );
  }

  if (filters.price_tier) {
    if (Array.isArray(filters.price_tier) && filters.price_tier.length > 0) {
      conditions.push(inArray(businesses.priceTier, filters.price_tier));
    } else if (typeof filters.price_tier === "string") {
      conditions.push(eq(businesses.priceTier, filters.price_tier));
    }
  }

  if (filters.business_category) {
    if (
      Array.isArray(filters.business_category) &&
      filters.business_category.length > 0
    ) {
      conditions.push(
        inArray(businesses.businessCategory, filters.business_category)
      );
    } else if (typeof filters.business_category === "string") {
      conditions.push(
        eq(businesses.businessCategory, filters.business_category)
      );
    }
  }

  if (filters.newly_added) {
    conditions.push(
      gte(businesses.createdAt, sql`CURRENT_DATE - INTERVAL '7 days'`)
    );
  }

  if (filters.open247) {
    conditions.push(eq(businesses.open247, true));
  }
  if (filters.offers_delivery) {
    conditions.push(eq(businesses.offersDelivery, true));
  }
  if (filters.offers_pickup) {
    conditions.push(eq(businesses.offersPickup, true));
  }

  if (filters.payment_options && filters.payment_options.length > 0) {
    const requiredCount = filters.payment_options.length;
    conditions.push(
      sql`${businesses.uen} IN (
        SELECT uen 
        FROM business_payment_options
        WHERE payment_option IN (${filters.payment_options.map((o: string) => o.toString()).join(",")})
        GROUP BY uen
        HAVING COUNT(DISTINCT payment_option) = ${requiredCount}
      )`
    );
  }

  return conditions;
}
