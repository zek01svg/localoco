export const ROUTES = {
    // Public
    HOME: "/",
    LOGIN: "/login",
    SIGNUP: "/signup",
    VERIFICATION: "/verification",

    // Protected
    MAP: "/map",
    BUSINESSES: "/businesses",
    BUSINESS: "/business/:id",
    BOOKMARKS: "/bookmarks",
    PROFILE: "/profile",
    BUSINESS_PROFILE: "/business-profile",
    FORUM: "/forum",
    NOTIFICATIONS: "/notifications",
    SETTINGS: "/settings",
    VOUCHERS: "/vouchers",
    REVIEW: "/review/:id",
    ANNOUNCEMENTS: "/announcements",
    FORGOT_PASSWORD: "/forgot-password",
    PASSWORD_RESET: "/password-reset", // ✅ ADDED

    // Error
    NOT_FOUND: "/404",
} as const;
