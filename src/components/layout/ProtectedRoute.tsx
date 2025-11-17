// components/layout/ProtectedRoute.tsx
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { ROUTES } from "../../constants/routes";
import { useThemeStore } from "../../store/themeStore";
import * as React from "react";
import type { UserRole } from "../../types/auth.store.types";
import { useEffect, useState } from "react";
import { AnnouncementsPage } from "../AnnouncementPage";

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: UserRole;
}

export const ProtectedRoute = ({
    children,
    requiredRole,
}: ProtectedRouteProps) => {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const role = useAuthStore((state) => state.role);
    const login = useAuthStore((state) => state.login);
    const location = useLocation();
    const [autoLoginChecked, setAutoLoginChecked] = useState(false);

    // --- Start of Integrated Wrapper Logic ---
    const navigate = useNavigate();

    // Get state required for the AnnouncementsPage
    const businessUen = useAuthStore(
        (state) => state.businessMode.currentBusinessUen,
    );
    const isDarkMode = useThemeStore((state) => state.isDarkMode);
    // --- End of Integrated Wrapper Logic ---

    // Auto-login in development
    useEffect(() => {
        const shouldAutoLogin =
            import.meta.env.DEV &&
            import.meta.env.VITE_DEV_AUTO_LOGIN !== "false" &&
            !isAuthenticated;

        if (shouldAutoLogin) {
            login("dev-user-1", "user", "dev-token-123");
        }

        // Mark as checked after first render
        setAutoLoginChecked(true);
    }, []); // Only run once on mount

    // Wait for auto-login check before redirecting
    if (!autoLoginChecked) {
        return null; // or a loading spinner
    }

    if (!isAuthenticated) {
        // Save where they were trying to go
        return (
            <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
        );
    }

    if (requiredRole && role !== requiredRole) {
        // Wrong role - redirect to home
        return <Navigate to={ROUTES.MAP} replace />;
    }

    if (location.pathname === ROUTES.ANNOUNCEMENTS) {
        // For this route, the user MUST be in business mode
        if (!businessUen) {
            // If not, redirect them to the home page
            return <Navigate to={ROUTES.HOME} replace />;
        }

        // If they are in business mode, render the AnnouncementsPage directly
        // This effectively "hijacks" the rendering from the routes.tsx file
        return (
            <AnnouncementsPage
                businessUen={businessUen}
                onBack={() => navigate(-1)} // Use navigate for the back function
                isDarkMode={isDarkMode}
            />
        );
    }

    return <>{children}</>;
};
