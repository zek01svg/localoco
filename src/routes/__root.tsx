import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";

import { SiteFooter } from "#client/components/custom/site-footer";
import { SiteHeader } from "#client/components/custom/site-header";
import { ErrorPage } from "#client/features/error/error-page";
import { LoadingPage } from "#client/features/loading/loading-page";
import { NotFoundPage } from "#client/features/not-found/not-found";

export const Route = createRootRoute({
  // Route-level states are scoped to the match lifecycle: each state resets
  // when the failed or pending match unmounts, so nothing leaks across routes.
  errorComponent: ErrorPage,
  pendingComponent: LoadingPage,
  notFoundComponent: NotFoundPage,
  component: () => (
    <NuqsAdapter>
      <div className="bg-background text-foreground flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex-1">
          <Outlet />
        </div>
        <SiteFooter />
      </div>
      {/* Devtools render a footer landmark that would duplicate the app's
          contentinfo in production; keep them out of shipped builds. */}
      {import.meta.env.DEV ? <TanStackRouterDevtools /> : null}
    </NuqsAdapter>
  ),
});
