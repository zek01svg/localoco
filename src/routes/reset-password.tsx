import { createFileRoute } from "@tanstack/react-router";

import { AuthPageShell, ResetPasswordForm } from "#client/features/auth";

interface ResetPasswordSearch {
  token?: string;
}

function ResetPasswordPage() {
  const search = Route.useSearch();
  return (
    <AuthPageShell>
      <ResetPasswordForm token={search.token} />
    </AuthPageShell>
  );
}

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>): ResetPasswordSearch => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  component: ResetPasswordPage,
});
