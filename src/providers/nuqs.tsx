// nuqs 2.10's TanStack adapter renders a HistorySpy that calls useRouter(),
// so it must be inside <RouterProvider>. The production placement is in
// src/routes/__root.tsx (wrapping <Outlet />). This provider is kept for
// backwards compatibility but should not wrap <RouterProvider> directly.
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";

export function NuqsProvider({ children }: { children: React.ReactNode }) {
  return <NuqsAdapter>{children}</NuqsAdapter>;
}
