import { NuqsAdapter } from "nuqs/adapters/tanstack-router";

export function NuqsProvider({ children }: { children: React.ReactNode }) {
  return <NuqsAdapter>{children}</NuqsAdapter>;
}
