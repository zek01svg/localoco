import type { ComponentProps } from "react";

import { ThemeProvider } from "next-themes";

export function AppThemeProvider({ children }: ComponentProps<"div">) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
