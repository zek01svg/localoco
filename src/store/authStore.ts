import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AuthState, AuthStore } from "../types/auth.store.types";

export interface UserBusiness {
    uen: string;
    businessName: string;
    ownerID: string;
    businessCategory?: string;
    wallpaper?: string;
}

const initialState: AuthState = {
    isAuthenticated: false,
    role: null,
    userId: null,
    accessToken: null,
    userProfile: null,
    avatarUrl: null, 
    businessMode: {
        isBusinessMode: false,
        currentBusinessUen: null,
        currentBusinessName: null,
    },
};

export const useAuthStore = create<AuthStore>()(
    persist(
        (set) => ({
            ...initialState,

            login: (userId, role, token) => {
                set({
                    isAuthenticated: true,
                    userId,
                    role,
                    accessToken: token || null,
                });
            },

            logout: () => {
                set(initialState);
            },

            setRole: (role) => {
                set({ role });
            },

            enableBusinessMode: (businessUen, businessName) => {
                set({
                    role: "business", 
                    businessMode: {
                        isBusinessMode: true,
                        currentBusinessUen: businessUen,
                        currentBusinessName: businessName,
                    },
                });
            },

            disableBusinessMode: () => {
                set({
                    role: "user", 
                    businessMode: {
                        isBusinessMode: false,
                        currentBusinessUen: null,
                        currentBusinessName: null,
                    },
                });
            },

            switchBusiness: (businessUen, businessName) => {
                set({
                    role: "business", 
                    businessMode: {
                        isBusinessMode: true,
                        currentBusinessUen: businessUen,
                        currentBusinessName: businessName,
                    },
                });
            },

            setUserProfile: (profile) => {
                set({ userProfile: profile });
            },

            setAvatarUrl: (url) => {
                set({ avatarUrl: url });
            },
        }),
        {
            name: "auth-storage",
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated,
                role: state.role,
                userId: state.userId,
                token: state.accessToken,
                businessMode: state.businessMode,
                avatarUrl: state.avatarUrl,
            }),
        },
    ),
);

export const selectIsAuthenticated = (state: AuthStore) =>
    state.isAuthenticated;
export const selectUserRole = (state: AuthStore) => state.role;
export const selectUserId = (state: AuthStore) => state.userId;
