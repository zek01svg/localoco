import * as React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppSidebar } from "../AppSidebar";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { useUser } from "../../hooks/useUser";
import { useAuthStore } from "../../store/authStore";
import { ROUTES } from "../../constants/routes";

export const MainLayout = () => {
    const { logout, userId } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const avatarUrl = useAuthStore((state) => state.avatarUrl);

    const { user, stats, updateUser } = useUser(userId || null);
    const isAuthenticated = !!userId; // Check if user is logged in

    const getCurrentView = () => {
        const path = location.pathname;
        if (path === ROUTES.MAP || path === ROUTES.HOME) return "map";
        if (path === ROUTES.BUSINESSES) return "list";
        if (path === ROUTES.BOOKMARKS) return "bookmarks";
        if (path === ROUTES.PROFILE) return "profile";
        if (path === ROUTES.FORUM) return "forum";
        if (path === ROUTES.NOTIFICATIONS) return "notifications";
        if (path === ROUTES.SETTINGS) return "settings";
        if (path === ROUTES.VOUCHERS) return "vouchers";
        // ✅ ADDED: Recognize the announcements path to highlight the icon
        if (path === ROUTES.ANNOUNCEMENTS) return "announcements";
        return "list"; // Default view
    };

    const handleNavigate = (view: string) => {
        const routeMap: Record<string, string> = {
            map: ROUTES.MAP,
            list: ROUTES.BUSINESSES,
            bookmarks: ROUTES.BOOKMARKS,
            profile:
                user && "businessName" in user
                    ? ROUTES.BUSINESS_PROFILE
                    : ROUTES.PROFILE,
            forum: ROUTES.FORUM,
            notifications: ROUTES.NOTIFICATIONS,
            settings: ROUTES.SETTINGS,
            vouchers: ROUTES.VOUCHERS,
            filters: ROUTES.BUSINESSES,
            // ✅ ADDED: Map the 'announcements' view to its route
            announcements: ROUTES.ANNOUNCEMENTS,
        };
        if (routeMap[view]) {
            navigate(routeMap[view]);
        }
    };

    const getUserInfo = () => {
        if (!user) {
            return {
                name: "Guest",
                email: "guest@localoco.com",
                avatarUrl: undefined,
                isGuest: true,
            };
        }

        if ("businessName" in user) {
            return {
                name: user.businessName,
                email: user.businessEmail,
                avatarUrl: avatarUrl || user.wallpaper,
                isGuest: false,
            };
        } else {
            console.log(
                "👤 User avatars - authStore:",
                avatarUrl,
                "userDB:",
                user.avatarUrl,
            );
            return {
                name: user.name,
                email: user.email,
                avatarUrl: avatarUrl || user.avatarUrl,
                isGuest: false,
            };
        }
    };

    const userInfo = getUserInfo();

    return (
        <>
            <AppSidebar
                onNavigate={handleNavigate}
                onLogout={logout}
                currentView={getCurrentView()}
                userName={userInfo.name}
                userEmail={userInfo.email}
                avatarUrl={userInfo.avatarUrl}
                onThemeToggle={toggleTheme}
                isAuthenticated={isAuthenticated}
            />
            <div className="main-content md:ml-20 h-screen overflow-y-auto pb-20 md:pb-0">
                {/* The Outlet renders the component for the current route, like AnnouncementsPage */}
                <Outlet
                    context={{ user, stats, updateUser, isAuthenticated }}
                />
            </div>
        </>
    );
};
