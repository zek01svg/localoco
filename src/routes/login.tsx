import { createFileRoute } from "@tanstack/react-router";

import { AuthPageShell, LoginForm } from "#client/features/auth";

function LoginPage() {
  return (
    <AuthPageShell>
      <LoginForm />
    </AuthPageShell>
  );
}

export const Route = createFileRoute("/login")({
  component: LoginPage,
});
