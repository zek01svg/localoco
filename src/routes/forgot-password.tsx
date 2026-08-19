import { createFileRoute } from "@tanstack/react-router";

import { AuthPageShell, ForgotPasswordForm } from "#client/features/auth";

function ForgotPasswordPage() {
  return (
    <AuthPageShell>
      <ForgotPasswordForm />
    </AuthPageShell>
  );
}

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});
