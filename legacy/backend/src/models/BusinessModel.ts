import { Business, HourEntry, DayOfWeek, BusinessPaymentOption, PriceTier, FilterOptions, BusinessToBeUpdated, BusinessForBusinessList } from "../types/Business.js";
import db from '../database/db.js'
import { businesses, businessReviews, forumPosts, forumPostsReplies, businessPaymentOptions, businessOpeningHours, user } from '../database/schema.js';
import { and, or, ilike, eq, inArray, gte, sql, asc, desc } from 'drizzle-orm';


class BusinessModel {

    public static async getAllBusinesses() {
        const businessRows = await db.select().from(businesses)
        const container: BusinessForBusinessList[] = [];

        for (const business of businessRows) {
            const paymentRows = await db.select().from(businessPaymentOptions).where(eq(businessPaymentOptions.uen, business.uen))
            const paymentOptions = paymentRows.map(p => p.paymentOption)
            const openingHours: Record<DayOfWeek, HourEntry> = {} as Record<DayOfWeek, HourEntry>

            const ratings = await db
            .select({ rating: businessReviews.rating })
            .from(businessReviews)
            .where(eq(businessReviews.businessUen, business.uen));

            const avgRating = ratings.length
            ? Math.round(ratings.reduce((sum, r) => sum + Number(r.rating), 0) / ratings.length)
            : 0;
            
            if (!business.open247) {
                const hourRows = await db.select().from(businessOpeningHours).where(eq(businessOpeningHours.uen, business.uen))
                for (const h of hourRows) {
                    openingHours[h.dayOfWeek as DayOfWeek] = { open: h.openTime, close: h.closeTime }
                }
            }

            const fullBusiness: BusinessForBusinessList = {
                ownerId:business.ownerId,
                uen: business.uen,
                businessName: business.businessName,
                businessCategory: business.businessCategory!, 
                description: business.description!,
                avgRating: avgRating,
                address: business.address!,
                latitude: business.latitude,
                longitude: business.longitude,
                open247: Boolean(business.open247),
                openingHours,
                email: business.email!,
                phoneNumber: business.phoneNumber!,
                websiteLink: business.websiteLink ?? null,
                socialMediaLink: business.socialMediaLink ?? null,
                wallpaper: business.wallpaper!,
                dateOfCreation: business.dateOfCreation!,
                priceTier: business.priceTier!,
                offersDelivery: Boolean(business.offersDelivery),
                offersPickup: Boolean(business.offersPickup),
                paymentOptions
            }
            container.push(fullBusiness)
        }
        
        return container
    }

    public static async getOwnedBusinesses(ownerId:string) {

        const ownedBusinesses = await db.select().from(businesses).where(eq(businesses.ownerId, ownerId))
        const container: Business[] = [];

        for (const business of ownedBusinesses) {
            const paymentRows = await db.select().from(businessPaymentOptions).where(eq(businessPaymentOptions.uen, business.uen))
            const paymentOptions = paymentRows.map(p => p.paymentOption)

            const openingHours: Record<DayOfWeek, HourEntry> = {} as Record<DayOfWeek, HourEntry>
            
            if (!business.open247) {
                const hourRows = await db.select().from(businessOpeningHours).where(eq(businessOpeningHours.uen, business.uen))
                for (const h of hourRows) {
                    openingHours[h.dayOfWeek as DayOfWeek] = { open: h.openTime, close: h.closeTime }
                }
            }

            const fullBusiness: Business = {
                ownerId:business.ownerId,
                uen: business.uen,
                businessName: business.businessName,
                businessCategory: business.businessCategory!, 
                description: business.description!,
                address: business.address!,
                latitude: business.latitude,
                longitude: business.longitude,
                open247: Boolean(business.open247),
                openingHours,
                email: business.email!,
                phoneNumber: business.phoneNumber!,
                websiteLink: business.websiteLink ?? null,
                socialMediaLink: business.socialMediaLink ?? null,
                wallpaper: business.wallpaper!,
                dateOfCreation: business.dateOfCreation!,
                priceTier: business.priceTier!,
                offersDelivery: Boolean(business.offersDelivery),
                offersPickup: Boolean(business.offersPickup),
                paymentOptions
            }
            container.push(fullBusiness)
        }

        return container
    }

    public static async getBusinessByUEN(uen: string): Promise<Business | null> {
        const businessRow = await db.select().from(businesses).where(eq(businesses.uen, uen))

        if (businessRow.length === 0 || !businessRow[0]) {
            return null
        }
        
        const business = businessRow[0]!
        const paymentRow = await db.select().from(businessPaymentOptions).where(eq(businessPaymentOptions.uen,uen))
        
        const paymentOptions = paymentRow.map(p => p.paymentOption)

        const openingHours: Record<DayOfWeek, HourEntry> = {} as Record<DayOfWeek, HourEntry>

        if (!business.open247) {
            const hourRows = await db.select().from(businessOpeningHours).where(eq(businessOpeningHours.uen, business.uen))
            for (const h of hourRows) {
                openingHours[h.dayOfWeek as DayOfWeek] = { open: h.openTime, close: h.closeTime }
            }
        }

        const fullBusiness:Business = {
            ownerId: business.ownerId,
            uen: business.uen,
            businessName: business.businessName,
            businessCategory: business.businessCategory!, 
            description: business.description!,
            address: business.address!,
            latitude: business.latitude!,
            longitude: business.longitude!,
            open247: Boolean(business.open247),
            openingHours,
            email: business.email!,
            phoneNumber: business.phoneNumber!,
            websiteLink: business.websiteLink ?? null,
            socialMediaLink: business.socialMediaLink ?? null,
            wallpaper: business.wallpaper!,
            dateOfCreation: business.dateOfCreation!,
            priceTier: business.priceTier!,
            offersDelivery: Boolean(business.offersDelivery),
            offersPickup: Boolean(business.offersPickup),
            paymentOptions
        }

        return fullBusiness      
    }

    public static async getFilteredBusinesses(filters: FilterOptions): Promise<Business[]> {
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
            } else if (typeof filters.price_tier === 'string') {
                conditions.push(eq(businesses.priceTier, filters.price_tier));
            }
        }

        if (filters.business_category) {
            if (Array.isArray(filters.business_category) && filters.business_category.length > 0) {
                conditions.push(inArray(businesses.businessCategory, filters.business_category));
            } else if (typeof filters.business_category === 'string') {
                conditions.push(eq(businesses.businessCategory, filters.business_category));
            }
        }

        if (filters.newly_added) {
            conditions.push(
                gte(businesses.dateOfCreation, sql`DATE_SUB(CURDATE(), INTERVAL 7 DAY)`)
            );
        }

        if (filters.open247) {
            conditions.push(eq(businesses.open247, 1));
        }
        if (filters.offers_delivery) {
            conditions.push(eq(businesses.offersDelivery, 1));
        }
        if (filters.offers_pickup) {
            conditions.push(eq(businesses.offersPickup, 1));
        }

        if (filters.payment_options && filters.payment_options.length > 0) {
            const requiredCount = filters.payment_options.length;
            conditions.push(
                sql`${businesses.uen} IN (
                    SELECT uen 
                    FROM ${businessPaymentOptions}
                    WHERE ${inArray(businessPaymentOptions.paymentOption, filters.payment_options)}
                    GROUP BY uen
                    HAVING COUNT(DISTINCT ${businessPaymentOptions.paymentOption}) = ${requiredCount}
                )`
            );
        }

        try {
            let query = db
                .select()
                .from(businesses)
                .$dynamic();

            if (conditions.length > 0) {
                query = query.where(and(...conditions));
            }

            const sortDirection = filters.sort_order === 'asc' ? asc : desc;
            switch (filters.sort_by) {
                case 'business_name':
                    query = query.orderBy(sortDirection(businesses.businessName));
                    break;
                case 'price_tier':
                    query = query.orderBy(sortDirection(businesses.priceTier));
                    break;
                case 'date_of_creation':
                default:
                    query = query.orderBy(sortDirection(businesses.dateOfCreation));
                    break;
            }

            const businessRows = await query;

            if (businessRows.length === 0) {
                return [];
            }

            const allUens = businessRows.map(b => b.uen);
            const allPaymentOptions = await db
                .select()
                .from(businessPaymentOptions)
                .where(inArray(businessPaymentOptions.uen, allUens));

            const nonOpen247Uens = businessRows
                .filter(b => !b.open247)
                .map(b => b.uen);
            
            const allOpeningHours = nonOpen247Uens.length > 0
                ? await db
                    .select()
                    .from(businessOpeningHours)
                    .where(inArray(businessOpeningHours.uen, nonOpen247Uens))
                : [];

            const paymentOptionsMap = new Map<string, string[]>();
            for (const payment of allPaymentOptions) {
                if (!paymentOptionsMap.has(payment.uen)) {
                    paymentOptionsMap.set(payment.uen, []);
                }
                paymentOptionsMap.get(payment.uen)!.push(payment.paymentOption);
            }

            const openingHoursMap = new Map<string, Record<DayOfWeek, HourEntry>>();
            for (const hour of allOpeningHours) {
                if (!openingHoursMap.has(hour.uen)) {
                    openingHoursMap.set(hour.uen, {} as Record<DayOfWeek, HourEntry>);
                }
                openingHoursMap.get(hour.uen)![hour.dayOfWeek as DayOfWeek] = {
                    open: hour.openTime,
                    close: hour.closeTime
                };
            }

            const fullBusinesses: Business[] = businessRows.map(business => ({
                ownerId:business.ownerId,
                uen: business.uen,
                businessName: business.businessName,
                businessCategory: business.businessCategory!,
                description: business.description!,
                address: business.address!,
                latitude: business.latitude,
                longitude: business.longitude,
                open247: Boolean(business.open247),
                openingHours: openingHoursMap.get(business.uen) || ({} as Record<DayOfWeek, HourEntry>),
                email: business.email!,
                phoneNumber: business.phoneNumber!,
                websiteLink: business.websiteLink ?? null,
                socialMediaLink: business.socialMediaLink ?? null,
                wallpaper: business.wallpaper!,
                dateOfCreation: business.dateOfCreation!,
                priceTier: business.priceTier!,
                offersDelivery: Boolean(business.offersDelivery),
                offersPickup: Boolean(business.offersPickup),
                paymentOptions: paymentOptionsMap.get(business.uen) || []
            }));

            return fullBusinesses;

        } catch (error) {
            console.error("Error filtering and searching businesses:", error);
            return [];
        }
    }

    public static async registerBusiness (business: Business) {
        try {

            // update hasBusiness first
            const result = await db.update(user).set({hasBusiness:1}).where(eq(user.id, business.ownerId))

            // ✅ Insert only into businesses table as database schema defines
            await db.insert(businesses).values({
                ownerId:business.ownerId,
                uen: business.uen,
                businessName: business.businessName,
                businessCategory: business.businessCategory,
                description: business.description,
                address: business.address,
                latitude: business.latitude || null,
                longitude: business.longitude || null,
                open247: business.open247 ? 1 : 0,
                email: business.email,
                phoneNumber: business.phoneNumber,
                websiteLink: business.websiteLink || null,
                socialMediaLink: business.socialMediaLink || null,
                wallpaper: business.wallpaper || null,
                dateOfCreation: business.dateOfCreation, 
                priceTier: business.priceTier,
                offersDelivery: business.offersDelivery ? 1 : 0,
                offersPickup: business.offersPickup ? 1 : 0,
            } as typeof businesses.$inferInsert)
                
            // ✅ Insert payment options into separate table
            if (business.paymentOptions?.length) {
                await Promise.all(
                    business.paymentOptions.map(option =>
                        db.insert(businessPaymentOptions).values({
                            uen: business.uen,
                            paymentOption: option
                        } as typeof businessPaymentOptions.$inferInsert)
                    )
                );
            }

            // ✅ Insert opening hours into separate table
            if (!business.open247 && business.openingHours) {
                const openingHourEntries = Object.entries(business.openingHours) as [DayOfWeek, HourEntry][];
                await Promise.all(
                    openingHourEntries.map(([day, hours]) =>
                        db.insert(businessOpeningHours).values({
                            uen: business.uen,
                            dayOfWeek: day,
                            openTime: hours.open,
                            closeTime: hours.close
                        } as typeof businessOpeningHours.$inferInsert)
                    )
                );
            }
        }
        catch (err: any) {
            console.error(`Error registering business: ${err}`)
            console.error('MySQL Error Code:', err.errno);
            console.error('MySQL Error Message:', err.sqlMessage);
            throw err;
        }
    }

    public static async searchBusinessByName(searchName: string): Promise<{uen: string, name: string} | null> {
        if (!searchName || !searchName.trim()) {
            return null;
        }

        const sanitized = searchName
            .toLowerCase()
            .replace(/[^\w\s'-]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        const exactMatch = await db.select({
            uen: businesses.uen,
            name: businesses.businessName
        })
        .from(businesses)
        .where(sql`LOWER(${businesses.businessName}) = ${sanitized}`)
        .limit(1);

        if (exactMatch.length > 0 && exactMatch[0]) {
            return { uen: exactMatch[0].uen, name: exactMatch[0].name };
        }

        const partialMatch = await db.select({
            uen: businesses.uen,
            name: businesses.businessName
        })
        .from(businesses)
        .where(sql`LOWER(${businesses.businessName}) LIKE ${'%' + sanitized + '%'}`)
        .limit(1);

        if (partialMatch.length > 0 && partialMatch[0]) {
            return { uen: partialMatch[0].uen, name: partialMatch[0].name };
        }

        const allBusinesses = await db.select({
            uen: businesses.uen,
            name: businesses.businessName
        })
        .from(businesses);

        for (const business of allBusinesses) {
            const businessNameLower = business.name.toLowerCase().replace(/[^\w\s'-]/g, '').replace(/\s+/g, ' ').trim();
            if (sanitized.includes(businessNameLower)) {
                return { uen: business.uen, name: business.name };
            }
        }

        return null;
    }

    public static async updateBusiness(business: BusinessToBeUpdated): Promise<void> {
        try {
            await db
            .update(businesses)
            .set({
                ownerId: business.ownerID,
                businessName: business.businessName,
                businessCategory: business.businessCategory,
                description: business.description,
                address: business.address,
                latitude: business.latitude,
                longitude: business.longitude,
                email: business.email,
                phoneNumber: business.phoneNumber,
                websiteLink: business.websiteLink || null,
                socialMediaLink: business.socialMediaLink || null,
                wallpaper: business.wallpaper || null,
                priceTier: business.priceTier,
                offersDelivery: business.offersDelivery ? 1 : 0,
                offersPickup: business.offersPickup ? 1 : 0
            }).where(eq(businesses.uen, business.uen))

            if (business.paymentOptions?.length) {
                await db.delete(businessPaymentOptions).where(eq(businessPaymentOptions.uen, business.uen))

                await Promise.all(
                    business.paymentOptions.map(option => {
                        return db.insert(businessPaymentOptions).values({
                            uen: business.uen,
                            paymentOption: option
                        } as typeof businessPaymentOptions.$inferInsert);
                    })
                );
            }

            if (!business.open247 && business.openingHours) {
                const openingHourEntries = Object.entries(business.openingHours) as [DayOfWeek, HourEntry][]

                await db.delete(businessOpeningHours).where(eq(businessOpeningHours.uen, business.uen))

                await Promise.all(
                    openingHourEntries.map(([day, hours]) =>
                        db.insert(businessOpeningHours).values({
                            uen: business.uen,
                            dayOfWeek: day,
                            openTime: hours.open,
                            closeTime: hours.close
                        } as typeof businessOpeningHours.$inferInsert)
                    )
                )
            }
            else {
                await db.delete(businessOpeningHours).where(eq(businessOpeningHours.uen, business.uen))
            }
        }
        catch (err: any) {
            console.error(`Error updating business: ${err}`)
            throw err;
        }
    }

    public static async deleteBusiness(uen: string): Promise<void> {
        try {
            await db.delete(businesses).where(eq(businesses.uen, uen))
        }
        catch (err: any) {
            console.error(`Error deleting business: ${err}`)
            throw err;
        }
    }

    public static async getBusinessByOwnerId(ownerId: string): Promise<BusinessForBusinessList | null> {
        try {
            const result = await db.select().from(businesses).where(eq(businesses.ownerId, ownerId)).limit(1);
            if (result.length === 0 || !result[0]) {
                return null;
            }

            const business = result[0]!; // Non-null assertion since we checked above

            // Fetch opening hours
            const hours = await db.select().from(businessOpeningHours).where(eq(businessOpeningHours.uen, business.uen));
            const openingHours: Record<DayOfWeek, HourEntry> = {} as Record<DayOfWeek, HourEntry>;
            hours.forEach((hour) => {
                openingHours[hour.dayOfWeek] = {
                    open: hour.openTime,
                    close: hour.closeTime,
                };
            });

            // Fetch payment options
            const paymentOptionsResult = await db.select().from(businessPaymentOptions).where(eq(businessPaymentOptions.uen, business.uen));
            const paymentOptions = paymentOptionsResult.map(po => po.paymentOption);

            // Calculate average rating
            const reviewsResult = await db.select().from(businessReviews).where(eq(businessReviews.businessUen, business.uen));
            const avgRating = reviewsResult.length > 0
                ? reviewsResult.reduce((sum, r) => sum + r.rating, 0) / reviewsResult.length
                : 0;

            return {
                ownerId: business.ownerId,
                uen: business.uen,
                businessName: business.businessName,
                businessCategory: business.businessCategory || '',
                description: business.description || '',
                avgRating,
                address: business.address || '',
                latitude: business.latitude || null,
                longitude: business.longitude || null,
                open247: business.open247 || 0,
                openingHours,
                email: business.email || '',
                phoneNumber: business.phoneNumber || '',
                websiteLink: business.websiteLink || null,
                socialMediaLink: business.socialMediaLink || null,
                wallpaper: business.wallpaper || '',
                dateOfCreation: business.dateOfCreation || '',
                priceTier: business.priceTier || '',
                offersDelivery: business.offersDelivery || 0,
                offersPickup: business.offersPickup || 0,
                paymentOptions,
            };
        } catch (error) {
            console.error('Error getting business by ownerId:', error);
            throw error;
        }
    }

    public static async checkUenExists(uen: string): Promise<boolean> {
        try {
            const result = await db.select().from(businesses).where(eq(businesses.uen, uen)).limit(1);
            return result.length > 0;
        } catch (error) {
            console.error('Error checking UEN:', error);
            throw error;
        }
    }
}

export default BusinessModel
