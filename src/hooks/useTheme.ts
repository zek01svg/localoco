import { useThemeStore } from "../store/themeStore";

export const useTheme = () => {
    const isDarkMode = useThemeStore((state) => state.isDarkMode);
    const toggleTheme = useThemeStore((state) => state.toggleTheme);
    const setTheme = useThemeStore((state) => state.setTheme);

    return {
        isDarkMode,
        toggleTheme,
        setTheme,
    };
};
