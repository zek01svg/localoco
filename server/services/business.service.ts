import checkDbResult from "server/utils/check-db-result";
import { Business, HourEntry, DayOfWeek, FilterOptions } from "../../shared/types/business.types";
import db from '../database/db'
import { businesses, businessReviews, businessPaymentOptions, businessOpeningHours, user } from '../database/schema';
import { and, or, ilike, eq, inArray, gte, sql, asc, desc } from 'drizzle-orm';

class BusinessService {

    /**
     * Registers a new business in the database within a transaction.
     * If any step fails, the entire transaction is rolled back.
     *
     * @param {Omit<Business, 'createdAt' | 'updatedAt' | 'avgRating'>} business - The business data object to be registered.
     * @returns {Promise<true>} A promise that resolves to true on successful registration.
     * @throws {Error} Throws an error if the transaction fails.
     */
    public static async registerBusiness(business: Omit<Business, 'createdAt' | 'updatedAt' | 'avgRating'>): Promise<Boolean | Error> {
    
        await db.transaction(async (tx) => {
            const hasBusinessUpdated = await tx.update(user)
                .set({ hasBusiness: true })
                .where(eq(user.id, business.ownerId));

            if (!checkDbResult(hasBusinessUpdated)) {
                throw new Error(`Failed to update hasBusiness column for: ${business.ownerId}`);
            }

            const businessRegistered = await tx.insert(businesses).values({
                ownerId:business.ownerId,
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
                websiteLink: business.websiteUrl,
                socialMediaLink: business.socialMediaUrl,
                wallpaperUrl: business.wallpaperUrl,
                priceTier: business.priceTier,
                offersDelivery: business.offersDelivery,
                offersPickup: business.offersPickup,
            } as typeof businesses.$inferInsert)

            if (!checkDbResult(businessRegistered)) {
                throw new Error('Failed to register business.');
            }

            for (const paymentOption of business.paymentOptions) {
                const paymentOptionInserted = await tx.insert(businessPaymentOptions).values({
                    uen: business.uen,
                    paymentOption: paymentOption
                } as typeof businessPaymentOptions.$inferInsert)

                if (!checkDbResult(paymentOptionInserted)) {
                    throw new Error('Failed to insert payment option/s')
                }
            };

            if (!business.open247 && business.openingHours) {
                const openingHourEntries = Object.entries(business.openingHours) as [DayOfWeek, HourEntry][];
                for (const openingHourEntry of openingHourEntries) {

                    const dayOfWeek = openingHourEntry[0];
                    const openTime = openingHourEntry[1].open
                    const closeTime = openingHourEntry[1].close

                    const openingHourEntryInserted = await tx.insert(businessOpeningHours).values({
                        uen: business.uen,
                        dayOfWeek: dayOfWeek,
                        openTime: openTime,
                        closeTime: closeTime
                    } as typeof businessOpeningHours.$inferInsert)

                    if (!checkDbResult(openingHourEntryInserted)) {
                        throw new Error('Failed to insert payment option/s')
                    }
                }
            };
        }) 

        return true
    };

    /**
     * Retrieves all businesses from the database.
     * * Fetches all business records.
     *
     * @returns {Promise<Business[]>} An array of fully-formed `Business` objects.
     */
    public static async getAllBusinesses() {
        const businessRows = await db.select().from(businesses);
        return this._hydrateBusinesses(businessRows);
    }

    /**
     * Retrieves all businesses owned by a specific user.
     *
     * @param {string} ownerId - The unique identifier of the business owner.
     * @returns {Promise<Business[]>} An array of `Business` objects owned by the user, or an empty array if none are found.
     */
    public static async getOwnedBusinesses(ownerId:string): Promise<Business[]> {
        
        const ownedBusinesses = await db.select().from(businesses).where(eq(businesses.ownerId, ownerId));
        return this._hydrateBusinesses(ownedBusinesses);
    }

    /**
     * Retrieves a single business by its Unique Entity Number (UEN).
     * * This function fetches the specific business and all its related data.
     *
     * @param {string} uen - The UEN of the business to retrieve.
     * @returns {Promise<Business | null>} The complete `Business` object, or `null` if a business with that UEN is not found.
     */
    public static async getBusinessByUen(uen: string): Promise<Business | null> {
        const businessRow = await db.select().from(businesses).where(eq(businesses.uen, uen));

        if (businessRow.length === 0) {
            return null;
        }
        
        const hydratedBusinesses = await this._hydrateBusinesses(businessRow);
        return hydratedBusinesses[0] || null;
    }

    /**
     * Retrieves a list of businesses based on a dynamic set of filters.
     * * This function builds a complex query using the `_buildFilterConditions` helper
     *
     * @param {FilterOptions} filters - An object containing all potential filter criteria (search, sorting, etc.).
     * @returns {Promise<Business[]>} An array of matching `Business` objects, or an empty array if no matches are found.
     */
    public static async getFilteredBusinesses(filters: FilterOptions): Promise<Business[] | []> {
        
        // 1. Build conditions
        const conditions = this._buildFilterConditions(filters);

        // 2. Build query
        let query = db
            .select()
            .from(businesses)
            .$dynamic();

        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }

        // 3. Add sorting
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
                query = query.orderBy(sortDirection(businesses.createdAt));
                break;
        }

        // 4. Run query
        const businessRows = await query;

        // 5. Hydrate and return
        return this._hydrateBusinesses(businessRows);
    }

    /**
     * Searches for a business by name, returning a minimal object for lookups. This function performs a multi-stage search after sanitizing the input:
     * 1. Attempts an exact, case-insensitive match.
     * 2. If no exact match, attempts a partial (LIKE) match.
     * 3. If still no match, checks if the search term *contains* a known business name.
     *
     * @param {string} searchName - The search query for the business name.
     * @returns {Promise<{uen: string, name: string} | null>} A simple object with UEN and name, or `null` if no match is found.
     */
    public static async searchBusinessByName(searchName: string): Promise<{uen: string, name: string} | null> {

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

    /**
     * Updates an existing business's information within a transaction.
     *
     * @param {Omit<Business, 'updatedAt' | 'avgRating' | 'createdAt'>} business - The business object containing updated information.
     * @returns {Promise<Business[]>} A promise that resolves to an array containing the updated business.
     * @throws {Error} Throws an error if the transaction fails.
     */
    public static async updateBusiness(business: Omit<Business, 'updatedAt' | 'avgRating' | 'createdAt'>): Promise<Business[]> {
        await db
        .update(businesses)
        .set({
            ownerId: business.ownerId,
            businessName: business.businessName,
            businessCategory: business.businessCategory,
            description: business.description,
            address: business.address,
            latitude: business.latitude,
            longitude: business.longitude,
            email: business.email,
            phoneNumber: business.phoneNumber,
            websiteUrl: business.websiteUrl,
            socialMediaUrl: business.socialMediaUrl,
            wallpaperUrl: business.wallpaperUrl,
            priceTier: business.priceTier,
            offersDelivery: business.offersDelivery,
            offersPickup: business.offersPickup
        }).where(eq(businesses.uen, business.uen))

        if (business.paymentOptions?.length) {
            
            const deleteOldPaymentOptionsResult = await db.delete(businessPaymentOptions).where(eq(businessPaymentOptions.uen, business.uen))
            if (!checkDbResult(deleteOldPaymentOptionsResult)) {
                throw new Error('Failed to delete old payment options')
            }

            for (const paymentOption of business.paymentOptions) {
                const paymentOptionInserted = await db.insert(businessPaymentOptions).values({
                    uen: business.uen,
                    paymentOption: paymentOption
                } as typeof businessPaymentOptions.$inferInsert)

                if (!checkDbResult(paymentOptionInserted)) {
                    throw new Error('Failed to insert payment option/s')
                }
            };
        }

        if (!business.open247 && business.openingHours) {
            const openingHourEntries = Object.entries(business.openingHours) as [DayOfWeek, HourEntry][]

            const deleteOldHoursResult = await db.delete(businessOpeningHours).where(eq(businessOpeningHours.uen, business.uen))
            if (!checkDbResult(deleteOldHoursResult)) {
                throw new Error('Failed to delete old opening hours')
            }

            for (const openingHourEntry of openingHourEntries) {

                const dayOfWeek = openingHourEntry[0];
                const openTime = openingHourEntry[1].open
                const closeTime = openingHourEntry[1].close

                const openingHourEntryInserted = await db.insert(businessOpeningHours).values({
                    uen: business.uen,
                    dayOfWeek: dayOfWeek,
                    openTime: openTime,
                    closeTime: closeTime
                } as typeof businessOpeningHours.$inferInsert)

                if (!checkDbResult(openingHourEntryInserted)) {
                    throw new Error('Failed to insert payment option/s')
                }
            }
        }
        else {
            await db.delete(businessOpeningHours).where(eq(businessOpeningHours.uen, business.uen))
        }

        const updatedBusiness = await db.select().from(businesses).where(eq(businesses.uen, business.uen))
        return this._hydrateBusinesses(updatedBusiness)
    }

    /**
     * Deletes a business from the database by its UEN.
     *
     * @param {string} uen - The UEN of the business to delete.
     * @returns {Promise<void>} Resolves on success.
     * @throws {Error} Throws an error if the database deletion fails.
     */
    public static async deleteBusiness(uen: string): Promise<void | Error> {
        const rawResult = await db.delete(businesses).where(eq(businesses.uen, uen))
        if (!checkDbResult(rawResult)) {
            throw new Error('Failed to delete business')
        }
    }

    /**
     * Checks if a specific UEN already exists in the database.
     *
     * @param {string} uen - The UEN to check for existence.
     * @returns {Promise<boolean>} A promise that resolves to `true` if the UEN exists, or `false` otherwise.
     */
    public static async checkUenExists(uen: string): Promise<boolean> {
        const result = await db.select().from(businesses).where(eq(businesses.uen, uen))
        return result.length > 0;
    }

    /**
     * [PRIVATE] Efficiently fetches and "hydrates" an array of raw business rows.
     * * This helper solves the N+1 query problem. It takes a list of basic business
     * rows, fetches all related data (payment options, opening hours, ratings)
     * in three parallel queries, processes them into fast-lookup Maps,
     * and finally stitches the data together into complete `Business` objects.
     *
     * @param {Array<typeof businesses.$inferSelect>} businessRows - An array of raw business objects from the database.
     * @returns {Promise<Business[]>} An array of fully-formed `Business` objects with all related data attached.
     */
    private static async _hydrateBusinesses(
        businessRows: (typeof businesses.$inferSelect)[]
    ): Promise<Business[]> {
        
        if (businessRows.length === 0) {
            return [];
        }

        const allUens = businessRows.map(b => b.uen);
        const nonOpen247Uens = businessRows
            .filter(b => !b.open247)
            .map(b => b.uen);

        // 1. Fetch all related data in parallel (3 queries total)
        const [
            allPaymentOptions,
            allOpeningHours,
            allRatings
        ] = await Promise.all([
            // Query 1: Get all payment options
            db.select()
              .from(businessPaymentOptions)
              .where(inArray(businessPaymentOptions.uen, allUens)),
            
            // Query 2: Get all opening hours (only for non-24/7)
            nonOpen247Uens.length > 0
                ? db.select().from(businessOpeningHours).where(inArray(businessOpeningHours.uen, nonOpen247Uens))
                : Promise.resolve([]),
            
            // Query 3: Get all ratings
            db.select({
                uen: businessReviews.uen,
                rating: businessReviews.rating
            }).from(businessReviews).where(inArray(businessReviews.uen, allUens))
        ]);

        // 2. Process related data into Maps for efficient O(1) lookup
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

        const ratingsMap = new Map<string, number[]>();
        for (const r of allRatings) {
            if (!ratingsMap.has(r.uen)) ratingsMap.set(r.uen, []);
            ratingsMap.get(r.uen)!.push(Number(r.rating));
        }

        // 3. Stitch everything together
        return businessRows.map(business => {
            const ratings = ratingsMap.get(business.uen) || [];
            const avgRating = ratings.length
                ? Math.round(ratings.reduce((sum, r) => sum + r, 0) / ratings.length)
                : 0;

            return {
                ownerId: business.ownerId,
                uen: business.uen,
                businessName: business.businessName,
                businessCategory: business.businessCategory,
                description: business.description,
                address: business.address,
                avgRating: avgRating, 
                latitude: business.latitude,
                longitude: business.longitude,
                open247: business.open247,
                openingHours: openingHoursMap.get(business.uen) || ({} as Record<DayOfWeek, HourEntry>),
                email: business.email,
                phoneNumber: business.phoneNumber,
                websiteUrl: business.websiteUrl,
                socialMediaUrl: business.socialMediaUrl,
                wallpaperUrl: business.wallpaperUrl,
                createdAt: business.createdAt,
                updatedAt: business.updatedAt,
                priceTier: business.priceTier,
                offersDelivery: business.offersDelivery,
                offersPickup: business.offersPickup,
                paymentOptions: paymentOptionsMap.get(business.uen) || []
            };
        });
    }

    /**
     * [PRIVATE] Builds the dynamic WHERE conditions array for the business filter query.
     * * This helper translates a high-level `FilterOptions` object into an
     * array of Drizzle-ORM conditions (e.g., `ilike`, `inArray`, `sql`)
     * that can be passed to the main query's `.where()` clause.
     *
     * @param {FilterOptions} filters - The filter options from the client.
     * @returns {any[]} An array of Drizzle-ORM condition objects.
     */
    private static _buildFilterConditions(filters: FilterOptions): any[] {
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
                gte(businesses.createdAt, sql`DATE_SUB(CURDATE(), INTERVAL 7 DAY)`)
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
                    FROM ${businessPaymentOptions}
                    WHERE ${inArray(businessPaymentOptions.paymentOption, filters.payment_options)}
                    GROUP BY uen
                    HAVING COUNT(DISTINCT ${businessPaymentOptions.paymentOption}) = ${requiredCount}
                )`
            );
        }
        
        return conditions;
    }
}

export default BusinessService