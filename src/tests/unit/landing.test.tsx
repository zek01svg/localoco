import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LandingPage } from "#client/features/landing/landing";

function renderLanding() {
  const rootRoute = createRootRoute({
    component: () => <Outlet />,
  });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: LandingPage,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });

  render(<RouterProvider router={router} />);
}

describe("LandingPage", () => {
  it("renders meaningful marketing content, not just a mount point", async () => {
    renderLanding();

    expect((await screen.findByRole("heading", { level: 1 })).textContent).toContain(
      "Find local gems"
    );
    expect(screen.getByRole("link", { name: "Let\u2019s go!" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Why LocaLoco?" })).toBeTruthy();
    expect(screen.getByText("Back the independents")).toBeTruthy();
    expect(screen.getByText("Visit & share")).toBeTruthy();
  });
});
