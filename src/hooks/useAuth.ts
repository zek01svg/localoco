// hooks/useAuth.ts
import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { ROUTES } from "../constants/routes";
import { UserRole } from "../types/auth.store.types";
import { authClient } from "../lib/authClient";
import { url } from "../constants/url";

export const useAuth = () => {
    const navigate = useNavigate();

    // Extract only the specific values and functions we need from the store
    const storeUserId = useAuthStore((state) => state.userId);
    const storeAccessToken = useAuthStore((state) => state.accessToken);
    const storeRole = useAuthStore((state) => state.role);
    const storeIsAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const storeLogin = useAuthStore((state) => state.login);
    const storeLogout = useAuthStore((state) => state.logout);

    // Use reactive session hook
    const { data: session, isPending } = authClient.useSession();

    // Sync session with local store whenever session changes
    useEffect(() => {
        if (!isPending && session?.user && session?.session) {
            const userId = session.user.id;
            const accessToken = session.session.token;
            const currentRole = storeRole || "user"; // Keep existing role or default to 'user'
            const userImage = session.user.image;

            // Only update if not already synced
            if (storeUserId !== userId || storeAccessToken !== accessToken) {
                console.log("🔄 Syncing session to store:", userId);
                storeLogin(userId, currentRole, accessToken);
            }

            // Always sync avatar (for Google users especially)
            if (userImage) {
                useAuthStore.getState().setAvatarUrl(userImage);
            }
        } else if (!isPending && !session?.user && storeIsAuthenticated) {
            // Session expired or user logged out on backend
            console.log("🔄 Session expired, clearing store");
            storeLogout();
        }
    }, [
        session,
        isPending,
        storeUserId,
        storeAccessToken,
        storeRole,
        storeIsAuthenticated,
        storeLogin,
        storeLogout,
    ]);

    const login = useCallback(
        async (email: string, password: string, role: UserRole) => {
            try {
                // Call better-auth API
                const { data, error } = await authClient.signIn.email({
                    email,
                    password,
                    callbackURL: url,
                });

                if (error) {
                    return {
                        success: false,
                        error: error.message || "Invalid credentials",
                    };
                }

                // Session will be automatically synced via useEffect above
                // Just update the role in store
                if (data?.user) {
                    const userId = data.user.id;
                    const accessToken = data.token || "";
                    storeLogin(userId, role, accessToken);
                    navigate(ROUTES.MAP);
                    return { success: true };
                } else {
                    return {
                        success: false,
                        error: "No session created",
                    };
                }
            } catch (error) {
                return {
                    success: false,
                    error:
                        error instanceof Error ? error.message : "Login failed",
                };
            }
        },
        [storeLogin, navigate],
    );

    const signup = useCallback(
        async (
            email: string,
            password: string,
            name: string,
            role: UserRole,
        ) => {
            try {
                // Call better-auth API
                const { data, error } = await authClient.signUp.email({
                    email,
                    password,
                    name,
                    callbackURL: url,
                });

                if (error) {
                    return {
                        success: false,
                        error: error.message || "Signup failed",
                    };
                }

                // Session will be automatically synced via useEffect above
                // Just update the role in store
                if (data?.user) {
                    const userId = data.user.id;
                    const accessToken = data.token || "";
                    storeLogin(userId, role, accessToken);
                    navigate(ROUTES.MAP);
                    return { success: true };
                } else {
                    // Signup successful but no auto-login, redirect to login
                    return {
                        success: true,
                        message: "Signup successful! Please log in.",
                    };
                }
            } catch (error) {
                return {
                    success: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Signup failed",
                };
            }
        },
        [storeLogin, navigate],
    );

    const logout = useCallback(async () => {
        try {
            console.log("🚪 Logging out...");
            // Call better-auth logout
            await authClient.signOut();
            console.log("✅ Backend session cleared");
        } catch (error) {
            console.error("❌ Logout error:", error);
        } finally {
            // Always clear local store
            storeLogout();
            console.log("✅ Local store cleared");

            // Redirect to home/login
            navigate(ROUTES.HOME);
        }
    }, [storeLogout, navigate]);

    return {
        isAuthenticated: storeIsAuthenticated,
        role: storeRole,
        userId: storeUserId,
        session: session,
        isPending: isPending,
        login,
        signup,
        logout,
    };
};
