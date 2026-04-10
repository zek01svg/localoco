import db from "@server/database/db";
import {
  businesses,
  businessOpeningHours,
  businessPaymentOptions,
  user,
} from "@server/database/schema";
import type {
  RegisterBusinessInput,
  UpdateBusinessInput,
} from "@server/database/schema";
import { enqueueEmail } from "@server/lib/email-queue";
import { generateNewBusinessListingEmail } from "@server/lib/mailer";
import logger from "@server/lib/pino";
import redis from "@server/lib/redis";
import type {
  FilterOptions,
  HydratedBusiness,
} from "@shared/types/business.types";
import type { EmailPayload } from "@shared/types/email.types";
import { and, asc, desc, eq, ilike } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import { _buildFilterConditions, _hydrate } from "./helpers";

export async function getAllBusinesses(): Promise<HydratedBusiness[]> {
  const cachedBusinesses =
    await redis.get<HydratedBusiness[]>("all-businesses");
  if (cachedBusinesses) {
    logger.info({ cacheKey: "all-businesses" }, "Cache hit for all businesses");
    return cachedBusinesses;
  }

  const result = await db.query.businesses.findMany({
    with: {
      businessOpeningHours: true,
      businessPaymentOptions: true,
      businessReviews: {
        with: {
          user: true,
        },
      },
    },
  });

  const hydratedResult = result.map((b) => _hydrate(b));
  await redis.set("all-businesses", hydratedResult, { ex: 3600 });
  return hydratedResult;
}

export async function getFilteredBusinesses(
  filters: FilterOptions
): Promise<HydratedBusiness[]> {
  const conditions = _buildFilterConditions(filters);
  const sortDirection = filters.sort_order === "asc" ? asc : desc;

  let orderByClause;
  switch (filters.sort_by) {
    case "business_name":
      orderByClause = sortDirection(businesses.businessName);
      break;
    case "price_tier":
      orderByClause = sortDirection(businesses.priceTier);
      break;
    case "date_of_creation":
    default:
      orderByClause = sortDirection(businesses.createdAt);
      break;
  }

  const businessRows = await db.query.businesses.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: orderByClause,
    with: {
      businessOpeningHours: true,
      businessPaymentOptions: true,
      businessReviews: {
        with: {
          user: true,
        },
      },
    },
  });

  return businessRows.map((b) => _hydrate(b));
}

export async function searchBusinessesByName(
  name: string
): Promise<HydratedBusiness[]> {
  const result = await db.query.businesses.findMany({
    where: ilike(businesses.businessName, `%${name}%`),
    with: {
      businessOpeningHours: true,
      businessPaymentOptions: true,
      businessReviews: {
        with: {
          user: true,
        },
      },
    },
  });

  const hydratedResult = result.map((b) => _hydrate(b));
  if (hydratedResult.length === 0) {
    throw new HTTPException(404, { message: "Business not found" });
  }

  return hydratedResult;
}

export async function getBusinessByUen(uen: string): Promise<HydratedBusiness> {
  const cachedBusiness = await redis.get<HydratedBusiness>(`business:${uen}`);
  if (cachedBusiness) {
    logger.info({ cacheKey: `business:${uen}`, uen }, "Cache hit");
    return cachedBusiness;
  }

  const business = await db.query.businesses.findFirst({
    where: eq(businesses.uen, uen),
    with: {
      businessOpeningHours: true,
      businessPaymentOptions: true,
      businessReviews: {
        with: {
          user: true,
        },
      },
    },
  });

  if (business === undefined) {
    throw new HTTPException(404, {
      message: `Business with UEN ${uen} not found`,
    });
  }

  const hydratedResult = _hydrate(business);
  await redis.set(`business:${uen}`, hydratedResult, { ex: 3600 });
  return hydratedResult;
}

export async function getOwnedBusinesses(
  ownerId: string
): Promise<HydratedBusiness[]> {
  const cachedOwnedBusinesses = await redis.get<HydratedBusiness[]>(
    `business:owned:${ownerId}`
  );
  if (cachedOwnedBusinesses) {
    logger.info(
      { cacheKey: `business:owned:${ownerId}`, ownerId },
      "Cache hit for owned businesses"
    );
    return cachedOwnedBusinesses;
  }
  logger.info(
    { cacheKey: `business:owned:${ownerId}`, ownerId },
    "Cache miss for owned businesses"
  );

  const ownedBusinesses = await db.query.businesses.findMany({
    where: eq(businesses.ownerId, ownerId),
    with: {
      businessOpeningHours: true,
      businessPaymentOptions: true,
      businessReviews: {
        with: {
          user: true,
        },
      },
    },
  });

  const hydratedResult = ownedBusinesses.map((b) => _hydrate(b));
  await redis.set(`business:owned:${ownerId}`, hydratedResult, { ex: 3600 });
  return hydratedResult;
}

export async function registerBusiness(
  business: RegisterBusinessInput
): Promise<void> {
  await db.transaction(async (tx) => {
    const hasBusinessUpdated = await tx
      .update(user)
      .set({ hasBusiness: true })
      .where(eq(user.id, business.ownerId))
      .returning();

    if (hasBusinessUpdated.length === 0) {
      throw new HTTPException(500, {
        message: `Failed to update hasBusiness for: ${business.ownerId}`,
      });
    }

    await tx.insert(businesses).values({
      ownerId: business.ownerId,
      uen: business.uen,
      businessName: business.businessName,
      businessCategory: business.businessCategory,
      description: business.description,
      address: business.address,
      latitude: business.latitude,
      longitude: business.longitude,
      open247: business.open247,
      email: business.email,
      phoneNumber: business.phoneNumber,
      websiteUrl: business.websiteUrl,
      socialMediaUrl: business.socialMediaUrl,
      wallpaperUrl: business.wallpaperUrl,
      priceTier: business.priceTier,
      offersDelivery: business.offersDelivery,
      offersPickup: business.offersPickup,
    });

    if (business.paymentOptions.length > 0) {
      await tx.insert(businessPaymentOptions).values(
        business.paymentOptions.map((po) => ({
          uen: business.uen,
          paymentOption: po as any,
        }))
      );
    }

    if (!business.open247 && business.openingHours) {
      const openingHourEntries = Object.entries(business.openingHours);
      if (openingHourEntries.length > 0) {
        await tx.insert(businessOpeningHours).values(
          openingHourEntries.map(([dayOfWeek, hours]) => ({
            uen: business.uen,
            dayOfWeek: dayOfWeek as any,
            openTime: (hours as any).open,
            closeTime: (hours as any).close,
          }))
        );
      }
    }
  });

  await redis.del("all-businesses");
  await redis.del(`business:owned:${business.ownerId}`);

  const owners = await db.query.user.findFirst({
    where: eq(user.id, business.ownerId),
  });

  if (owners) {
    const email: EmailPayload = {
      to: (owners as any).profile?.email || owners.email,
      subject: "Your listing is live!",
      htmlContent: generateNewBusinessListingEmail({
        uen: business.uen,
        businessName: business.businessName,
        businessCategory: business.businessCategory,
        address: business.address,
      }),
    };
    await enqueueEmail(email);
  }
}

export async function updateBusiness(
  business: UpdateBusinessInput
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(businesses)
      .set(business)
      .where(eq(businesses.uen, business.uen));

    if (business.paymentOptions && business.paymentOptions.length > 0) {
      await tx
        .delete(businessPaymentOptions)
        .where(eq(businessPaymentOptions.uen, business.uen));
      await tx.insert(businessPaymentOptions).values(
        business.paymentOptions.map((po) => ({
          uen: business.uen,
          paymentOption: po as any,
        }))
      );
    }

    if (business.open247) {
      await tx
        .delete(businessOpeningHours)
        .where(eq(businessOpeningHours.uen, business.uen));
    } else if (business.openingHours) {
      const openingHourEntries = Object.entries(business.openingHours);
      await tx
        .delete(businessOpeningHours)
        .where(eq(businessOpeningHours.uen, business.uen));
      if (openingHourEntries.length > 0) {
        await tx.insert(businessOpeningHours).values(
          openingHourEntries.map(([dayOfWeek, hours]) => ({
            uen: business.uen,
            dayOfWeek: dayOfWeek as any,
            openTime: (hours as any).open,
            closeTime: (hours as any).close,
          }))
        );
      }
    }
  });

  await redis.del("all-businesses");
  await redis.del(`business:${business.uen}`);
  await redis.del(`business:owned:${business.ownerId}`);
}

export async function requireBusinessByUen(uen: string) {
  const cached = await redis.get<any>(`business:${uen}`);
  if (cached) {
    logger.info({ uen }, "Cache hit for business by UEN");
    return cached;
  }

  const items = await db
    .select()
    .from(businesses)
    .where(eq(businesses.uen, uen));
  if (items.length === 0) {
    throw new HTTPException(404, { message: "Business not found" });
  }

  const business = items[0];
  await redis.set(`business:${uen}`, business, { ex: 3600 });
  return business;
}

export async function deleteBusinessByUen(
  uen: string,
  ownerId: string
): Promise<void> {
  await db.delete(businesses).where(eq(businesses.uen, uen));

  await redis.del("all-businesses");
  await redis.del(`business:${uen}`);
  await redis.del(`business:owned:${ownerId}`);
}

export async function checkUenAvailability(uen: string): Promise<boolean> {
  const result = await db
    .select()
    .from(businesses)
    .where(eq(businesses.uen, uen));
  return result.length > 0;
}
