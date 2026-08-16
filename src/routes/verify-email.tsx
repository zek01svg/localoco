import { Link, createFileRoute } from "@tanstack/react-router";

import { VerifyEmailView } from "#client/features/auth";

interface VerifyEmailSearch {
  token?: string;
}

function VerifyEmailRouteComponent() {
  const search = Route.useSearch();
  return (
    <div className="bg-background flex min-h-screen flex-col justify-center px-6 py-12">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link
          to="/"
          className="text-primary mx-auto block text-center text-2xl font-bold tracking-tight"
        >
          LocaLoco
        </Link>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <VerifyEmailView token={search.token} />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/verify-email")({
  validateSearch: (search: Record<string, unknown>): VerifyEmailSearch => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  component: VerifyEmailRouteComponent,
});
