import {
    mysqlTable,
    primaryKey,
    varchar,
    text,
    index,
    int,
    timestamp,
    mysqlEnum,
    time,
    decimal,
    unique,
    boolean
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const account = mysqlTable(
    "account",
    {
        id: varchar({ length: 36 }).notNull(),
        accountId: text("account_id").notNull(),
        providerId: text("provider_id").notNull(),
        userId: varchar("user_id", { length: 36 })
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        accessToken: text("access_token"),
        refreshToken: text("refresh_token"),
        idToken: text("id_token"),
        accessTokenExpiresAt: timestamp("access_token_expires_at", {
            fsp: 3,
            mode: "string",
        }),
        refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
            fsp: 3,
            mode: "string",
        }),
        scope: text(),
        password: text(),
        createdAt: timestamp("created_at", { fsp: 3, mode: "string" })
            .default(sql`(now())`)
            .notNull(),
        updatedAt: timestamp("updated_at", { fsp: 3, mode: "string" })
            .default(sql`(now())`)
            .notNull(),
    },
    (table) => [primaryKey({ columns: [table.id], name: "account_id" })]
);

export const bookmarkedBusinesses = mysqlTable(
    "bookmarked_businesses",
    {
        userId: varchar("user_id", { length: 36 })
            .notNull()
            .references(() => user.id),
        uen: varchar("uen", { length: 20 })
            .notNull()
            .references(() => businesses.uen, {
                onDelete: "cascade",
                onUpdate: "cascade",
            }),
    },
    (table) => [
        index("business_uen").on(table.uen),
        primaryKey({
            columns: [table.userId, table.uen],
            name: "bookmarked_businesses_user_id_business_uen",
        }),
    ]
);

export const businessAnnouncements = mysqlTable(
    "business_announcements",
    {
        announcementId: int("announcement_id").autoincrement().notNull(),
        uen: varchar("uen", { length: 20 })
            .notNull()
            .references(() => businesses.uen, {
                onDelete: "cascade",
                onUpdate: "cascade",
            }),
        title: varchar({ length: 255 }).notNull(),
        content: text().notNull(),
        imageUrl: varchar("image_url", { length: 500 }).notNull(),
        createdAt: timestamp("created_at", { mode: "string" })
            .default(sql`(now())`)
            .notNull(),
        updatedAt: timestamp("updated_at", { mode: "string" })
            .default(sql`(now())`)
            .onUpdateNow()
            .notNull(),
    },
    (table) => [
        index("business_uen").on(table.uen),
        primaryKey({
            columns: [table.announcementId],
            name: "business_announcements_announcement_id",
        }),
    ]
);

export const businessOpeningHours = mysqlTable(
    "business_opening_hours",
    {
        id: int().autoincrement().notNull(),
        uen: varchar({ length: 20 })
            .notNull()
            .references(() => businesses.uen, {
                onDelete: "cascade",
                onUpdate: "cascade",
            }),
        dayOfWeek: mysqlEnum("day_of_week", [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
        ]).notNull(),
        openTime: time("open_time").notNull(),
        closeTime: time("close_time").notNull(),
    },
    (table) => [
        index("uen").on(table.uen),
        primaryKey({ columns: [table.id], name: "business_opening_hours_id" }),
    ]
);

export const businessPaymentOptions = mysqlTable(
    "business_payment_options",
    {
        id: int().autoincrement().notNull(),
        uen: varchar({ length: 20 })
            .notNull()
            .references(() => businesses.uen, {
                onDelete: "cascade",
                onUpdate: "cascade",
            }),
        paymentOption: varchar("payment_option", { length: 50 }).notNull(),
    },
    (table) => [
        index("uen").on(table.uen),
        primaryKey({
            columns: [table.id],
            name: "business_payment_options_id",
        }),
    ]
);

export const businessReviews = mysqlTable(
    "business_reviews",
    {
        id: int().autoincrement().notNull(),
        email: varchar("user_email", { length: 255 })
            .notNull()
            .references(() => user.email, {
                onDelete: "cascade",
                onUpdate: "cascade",
            }),
        uen: varchar("uen", { length: 20 }).references(
            () => businesses.uen,
            { onDelete: "cascade" }
        ).notNull(),
        rating: int().notNull(),
        body: text().notNull(),
        likeCount: int("like_count").default(0).notNull(),
        createdAt: timestamp("created_at", { fsp: 3, mode: "string" })
            .default(sql`(now())`)
            .notNull(),
    },
    (table) => [
        primaryKey({ columns: [table.id], name: "business_reviews_id" }),
    ]
);

export const businesses = mysqlTable(
    "businesses",
    {
        ownerId: varchar("owner_id", { length: 255 })
            .notNull()
            .references(() => user.id, {
                onDelete: "cascade",
                onUpdate: "cascade",
            }),
        uen: varchar({ length: 20 }).notNull(),
        businessName: varchar("business_name", { length: 255 }).notNull(),
        businessCategory: varchar("business_category", { length: 100 }).notNull(),
        description: text().notNull(),
        address: varchar({ length: 500 }).notNull(),
        latitude: decimal({ precision: 9, scale: 6 }).notNull(),
        longitude: decimal({ precision: 9, scale: 6 }).notNull(),
        open247: boolean("open247").default(false).notNull(),
        email: varchar({ length: 100 }),
        phoneNumber: varchar("phone_number", { length: 20 }),
        websiteUrl: varchar("website_url", { length: 255 }),
        socialMediaUrl: varchar("social_media_url", { length: 255 }),
        wallpaperUrl: varchar({ length: 255 }).notNull(),
        createdAt: timestamp("created_at", { fsp: 3, mode: "string" })
            .default(sql`(now())`)
            .notNull(),
        updatedAt: timestamp("updated_at", { fsp: 3, mode: "string" })
            .onUpdateNow(),
        priceTier: mysqlEnum("price_tier", ["low", "medium", "high"]).notNull(),
        offersDelivery: boolean("offers_delivery").default(false).notNull(),
        offersPickup: boolean("offers_pickup").default(false).notNull(),
    },
    (table) => [primaryKey({ columns: [table.uen], name: "businesses_uen" })]
);

export const forumPosts = mysqlTable(
    "forum_posts",
    {
        id: int().autoincrement().notNull(),
        email: varchar("email", { length: 255 })
            .notNull()
            .references(() => user.email, {
                onDelete: "cascade",
                onUpdate: "cascade",
            }),
        uen: varchar("uen", { length: 20 }).references(
            () => businesses.uen,
            { onDelete: "cascade" }
        ).notNull(),
        title: varchar({ length: 255 }),
        body: text().notNull(),
        likeCount: int("like_count").default(0).notNull(),
        createdAt: timestamp("created_at", { fsp: 3, mode: "string" })
            .default(sql`(now())`)
            .notNull(),
    },
    (table) => [
        index("uen").on(table.uen),
        index("user_email").on(table.email),
        primaryKey({ columns: [table.id], name: "forum_posts_id" }),
    ]
);

export const forumPostsReplies = mysqlTable(
    "forum_posts_replies",
    {
        id: int().autoincrement().notNull(),
        postId: int("post_id")
            .notNull()
            .references(() => forumPosts.id, { onDelete: "cascade" }),
        email: varchar("email", { length: 255 })
            .notNull()
            .references(() => user.email, {
                onDelete: "cascade",
                onUpdate: "cascade",
            }),
        body: text().notNull(),
        likeCount: int("like_count").default(0),
        createdAt: timestamp("created_at", { fsp: 3, mode: "string" })
            .default(sql`(now())`)
            .notNull(),
    },
    (table) => [
        index("post_id").on(table.postId),
        index("user_id").on(table.email),
        primaryKey({ columns: [table.id], name: "forum_posts_replies_id" }),
    ]
);

export const referrals = mysqlTable(
    "referrals",
    {
        refId: int("ref_id").autoincrement().notNull(),
        referrerId: varchar("referrer_id", { length: 36 })
            .notNull()
            .references(() => user.id, {
                onDelete: "cascade",
                onUpdate: "cascade",
            }),
        referredId: varchar("referred_id", { length: 36 })
            .notNull()
            .references(() => user.id, {
                onDelete: "cascade",
                onUpdate: "cascade",
            }),
        referralCode: varchar("referral_code", { length: 10 }).notNull(),
        status: mysqlEnum(["claimed", "qualified", "rewarded", "rejected"])
            .default("claimed")
            .notNull(),
        referredAt: timestamp("referred_at", { fsp: 3, mode: "string" })
            .default(sql`(now())`)
            .notNull(),
    },
    (table) => [
        index("idx_referred").on(table.referredId),
        index("idx_referrer").on(table.referrerId),
        primaryKey({ columns: [table.refId], name: "referrals_ref_id" }),
        unique("uq_referrer_referred").on(table.referrerId, table.referredId),
    ]
);

export const session = mysqlTable(
    "session",
    {
        id: varchar({ length: 36 }).notNull(),
        expiresAt: timestamp("expires_at", {
            fsp: 3,
            mode: "string",
        }).notNull(),
        token: varchar({ length: 255 }).notNull(),
        createdAt: timestamp("created_at", { fsp: 3, mode: "string" })
            .default(sql`(now())`)
            .notNull(),
        updatedAt: timestamp("updated_at", {
            fsp: 3,
            mode: "string",
        }).notNull(),
        ipAddress: text("ip_address"),
        userAgent: text("user_agent"),
        userId: varchar("user_id", { length: 36 })
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
    },
    (table) => [
        primaryKey({ columns: [table.id], name: "session_id" }),
        unique("session_token_unique").on(table.token),
    ]
);

export const user = mysqlTable(
    "user",
    {
        id: varchar({ length: 36 }).notNull(),
        name: text().notNull(),
        email: varchar({ length: 255 }).notNull(),
        emailVerified: boolean("email_verified").default(false).notNull(),
        imageUrl: text().notNull(),
        createdAt: timestamp("created_at", { fsp: 3, mode: "string" })
            .default(sql`(now())`)
            .notNull(),
        updatedAt: timestamp("updated_at", { fsp: 3, mode: "string" })
            .default(sql`(now())`)
            .notNull()
            .onUpdateNow(),
        hasBusiness: boolean("has_business").default(false).notNull(),
        referralCode: text("referral_code").notNull(),
        referredByUserId: text("referred_by_user_id"),
        bio: text().default('').notNull(),
    },
    (table) => [
        primaryKey({ columns: [table.id], name: "user_id" }),
        unique("user_email_unique").on(table.email),
    ]
);

export const userPoints = mysqlTable(
    "user_points",
    {
        email: varchar("user_email", { length: 255 })
            .notNull()
            .references(() => user.email, {
                onDelete: "cascade",
                onUpdate: "cascade",
            }),
        points: int().default(0).notNull(),
    },
    (table) => [
        primaryKey({
            columns: [table.email],
            name: "user_points_user_email",
        }),
    ]
);

export const verification = mysqlTable(
    "verification",
    {
        id: varchar({ length: 36 }).notNull(),
        identifier: text().notNull(),
        value: text().notNull(),
        expiresAt: timestamp("expires_at", {
            fsp: 3,
            mode: "string",
        }).notNull(),
        createdAt: timestamp("created_at", { fsp: 3, mode: "string" })
            .default(sql`(now())`)
            .notNull(),
        updatedAt: timestamp("updated_at", { fsp: 3, mode: "string" })
            .default(sql`(now())`)
            .notNull(),
    },
    (table) => [primaryKey({ columns: [table.id], name: "verification_id" })]
);

export const vouchers = mysqlTable(
    "vouchers",
    {
        voucherId: int("voucher_id").autoincrement().notNull(),
        userId: varchar("user_id", { length: 36 })
            .notNull()
            .references(() => user.id, {
                onDelete: "cascade",
                onUpdate: "cascade",
            }),
        refId: int("ref_id").references(() => referrals.refId, {
            onDelete: "set null",
            onUpdate: "cascade",
        }),
        amount: int().notNull(),
        status: mysqlEnum(["issued", "used", "expired", "revoked"])
            .default("issued")
            .notNull(),
        issuedAt: timestamp("issued_at", { fsp: 3, mode: "string" })
            .default(sql`(now())`)
            .notNull(),
        expiresAt: timestamp("created_at", {
            fsp: 3,
            mode: "string",
        }).notNull(),
    },
    (table) => [
        index("idx_v_expires").on(table.expiresAt),
        index("idx_v_status").on(table.status),
        index("idx_v_user").on(table.userId),
        primaryKey({ columns: [table.voucherId], name: "vouchers_voucher_id" }),
    ]
);