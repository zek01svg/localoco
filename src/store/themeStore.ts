import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ThemeStore } from "../types/theme.store.types";

export const useThemeStore = create<ThemeStore>()(
    persist(
        (set) => ({
            isDarkMode: true,

            toggleTheme: () => {
                set((state) => ({ isDarkMode: !state.isDarkMode }));
            },

            setTheme: (isDark) => {
                set({ isDarkMode: isDark });
            },
        }),
        {
            name: "theme-storage",
        },
    ),
);

// Selector
export const selectIsDarkMode = (state: ThemeStore) => state.isDarkMode;
