// App.tsx
import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./routes";
import { Toaster } from "./components/ui/sonner";
import { useThemeStore } from "./store/themeStore";

export default function App() {
    const isDarkMode = useThemeStore((state) => state.isDarkMode);

    // Apply dark mode class to document element for portaled components
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, [isDarkMode]);

    return (
        <BrowserRouter>
            <div className={isDarkMode ? "dark" : ""}>
                <AppRoutes />
                <Toaster />
            </div>
        </BrowserRouter>
    );
}
