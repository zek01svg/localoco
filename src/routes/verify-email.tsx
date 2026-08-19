import { createFileRoute } from "@tanstack/react-router";

import { AuthPageShell, VerifyEmailView } from "#client/features/auth";

interface VerifyEmailSearch {
  token?: string;
}

function VerifyEmailRouteComponent() {
  const search = Route.useSearch();
  return (
    <AuthPageShell>
      <VerifyEmailView token={search.token} />
    </AuthPageShell>
  );
}

export const Route = createFileRoute("/verify-email")({
  validateSearch: (search: Record<string, unknown>): VerifyEmailSearch => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  component: VerifyEmailRouteComponent,
});
