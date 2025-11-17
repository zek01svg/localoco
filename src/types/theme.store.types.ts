export interface ThemeState {
    isDarkMode: boolean;
}

export interface ThemeActions {
    toggleTheme: () => void;
    setTheme: (isDark: boolean) => void;
}

export type ThemeStore = ThemeState & ThemeActions;
