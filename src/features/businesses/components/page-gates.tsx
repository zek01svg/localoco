import type { ReactNode } from "react";

import { Navigate } from "@tanstack/react-router";

import { Card, CardDescription, CardHeader, CardTitle } from "#client/components/ui/card";
import { useSession } from "#client/features/auth";

// The loading placeholder both Business pages show while the session loads.
export function PageSkeleton() {
  return (
    <main className="bg-background flex min-h-screen items-start justify-center p-6">
      <div className="bg-muted/40 h-96 w-full max-w-xl animate-pulse rounded-xl border" />
    </main>
  );
}

// Shown to signed-in members who have not verified their email: only verified
// members may create or manage a Business.
function VerifyEmailCard({ description }: { description: string }) {
  return (
    <main className="bg-background flex min-h-screen items-start justify-center p-6">
      <Card className="mt-16 w-full max-w-xl">
        <CardHeader>
          <CardTitle>
            <h1 className="text-xl font-semibold">Verify your email first</h1>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}

export function BusinessesPageGates({ children }: { children: ReactNode }) {
  const { isAuthenticated, isVerified, isPending } = useSession();

  if (isPending) {
    return <PageSkeleton />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  if (!isVerified) {
    return (
      <VerifyEmailCard description="Check your inbox for the verification link to continue." />
    );
  }
  return children;
}
