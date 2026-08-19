import { createFileRoute } from "@tanstack/react-router";

import { AuthPageShell, SignupForm } from "#client/features/auth";

function SignupPage() {
  return (
    <AuthPageShell>
      <SignupForm />
    </AuthPageShell>
  );
}

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});
