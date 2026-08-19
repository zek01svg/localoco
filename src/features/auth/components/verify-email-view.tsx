import { Link } from "@tanstack/react-router";
import { AlertTriangleIcon, CheckCircle2Icon } from "lucide-react";

import { Skeleton } from "#client/components/ui/skeleton";

import { useVerifyEmailQuery } from "../hooks/auth-queries";
import { AuthCard } from "./shell";

interface VerifyEmailViewProps {
  token?: string;
}

export function VerifyEmailSkeleton() {
  return (
    <div className="bg-card text-card-foreground border-border mx-auto max-w-md space-y-6 rounded-xl border p-8 text-center shadow-sm">
      <div className="flex flex-col items-center space-y-3">
        <Skeleton className="size-12 rounded-full" />
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-4 w-60" />
      </div>
      <Skeleton className="mx-auto h-9 w-36 rounded-md" />
    </div>
  );
}

function VerifySuccessState() {
  return (
    <AuthCard className="text-center">
      <div className="flex flex-col items-center">
        <div className="bg-primary/10 text-primary mb-4 flex size-12 items-center justify-center rounded-full">
          <CheckCircle2Icon aria-hidden="true" className="size-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Email verified successfully</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Your email is now confirmed. You have full access to discover businesses, post reviews,
          and participate in the LocaLoco community.
        </p>
        <Link
          to="/"
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors"
        >
          Continue to LocaLoco
        </Link>
      </div>
    </AuthCard>
  );
}

function VerifyErrorState({ errorMessage }: { errorMessage: string | null }) {
  return (
    <AuthCard className="text-center">
      <div className="flex flex-col items-center">
        <div className="bg-destructive/10 text-destructive mb-4 flex size-12 items-center justify-center rounded-full">
          <AlertTriangleIcon aria-hidden="true" className="size-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Verification failed</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          {errorMessage ?? "We could not verify your email address with this link."}
        </p>

        <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            to="/login"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    </AuthCard>
  );
}

export function VerifyEmailView({ token }: VerifyEmailViewProps) {
  const { isPending, error, isSuccess } = useVerifyEmailQuery(token);

  if (!token) {
    return <VerifyErrorState errorMessage="No verification token was provided in the link." />;
  }

  if (isPending) {
    return <VerifyEmailSkeleton />;
  }

  if (isSuccess) {
    return <VerifySuccessState />;
  }

  return <VerifyErrorState errorMessage={error.message} />;
}
