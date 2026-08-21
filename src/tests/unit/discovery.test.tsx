import type { Listing } from "#shared/contracts/listings";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { env } from "#client/env";
import { DiscoveryPage } from "#client/features/discovery";

const fetchMock = vi.fn<(_input: string, _init?: RequestInit) => Promise<Response>>();

function stubBrowser() {
  vi.stubGlobal("fetch", fetchMock);
}

function unstubBrowser() {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const listing = (id: string, name: string): Listing => ({
  id,
  name,
  category: "Cafe",
  address: "1 Test Road",
  postalCode: "123456",
  phone: null,
  email: null,
  website: null,
  paymentOptions: null,
  priceRange: null,
  latitude: 1.2956,
  longitude: 103.7764,
});

function renderDiscovery() {
  const rootRoute = createRootRoute({
    component: () => (
      <NuqsAdapter>
        <Outlet />
      </NuqsAdapter>
    ),
  });
  const listingsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/listings",
    component: DiscoveryPage,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([listingsRoute]),
    history: createMemoryHistory({ initialEntries: ["/listings"] }),
  });

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

// Serve per-endpoint responses by URL, so tests declare one mock for the
// categories request and one for the feed regardless of firing order.
function mockApi(handler: (url: URL) => Response) {
  fetchMock.mockImplementation(async input => {
    const url = new URL(input);
    return handler(url);
  });
}

describe("DiscoveryPage", () => {
  beforeEach(stubBrowser);
  afterEach(unstubBrowser);

  it("renders the directory with listing details", async () => {
    mockApi(url => {
      if (url.pathname === "/api/listings/categories") {
        return jsonResponse({ items: ["Bakery", "Cafe"] }, 200);
      }
      return jsonResponse(
        {
          items: [listing("lst_1", "Garden Cove Cafe"), listing("lst_2", "Sunrise Roastery")],
          nextCursor: null,
        },
        200
      );
    });

    renderDiscovery();

    await waitFor(() => {
      expect(screen.getByText("Garden Cove Cafe")).toBeDefined();
    });
    expect(screen.getByText("Sunrise Roastery")).toBeDefined();
    expect(screen.getAllByText("Cafe").length).toBeGreaterThan(0);
    expect(screen.getByRole("combobox")).toBeDefined();
    expect(screen.getByRole("searchbox")).toBeDefined();
  });

  it("renders an honest empty state when nothing matches", async () => {
    mockApi(url => {
      if (url.pathname === "/api/listings/categories") {
        return jsonResponse({ items: ["Cafe"] }, 200);
      }
      return jsonResponse({ items: [], nextCursor: null }, 200);
    });

    renderDiscovery();

    await waitFor(() => {
      expect(screen.getByText("No businesses matched")).toBeDefined();
    });
    expect(screen.queryByText(/could not be loaded/iu)).toBeNull();
  });

  it("renders a retryable error state on dependency failure, never an empty directory", async () => {
    mockApi(url => {
      if (url.pathname === "/api/listings/categories") {
        return jsonResponse({ items: ["Cafe"] }, 200);
      }
      return jsonResponse(
        {
          error: {
            code: "dependency_unavailable",
            message: "Listings are temporarily unavailable.",
            requestId: "req-1",
          },
        },
        503
      );
    });

    renderDiscovery();

    await waitFor(() => {
      expect(screen.getByText("Business listings could not be loaded")).toBeDefined();
    });
    expect(screen.queryByText("No businesses matched")).toBeNull();

    mockApi(url => {
      if (url.pathname === "/api/listings/categories") {
        return jsonResponse({ items: ["Cafe"] }, 200);
      }
      return jsonResponse({ items: [listing("lst_1", "Garden Cove Cafe")], nextCursor: null }, 200);
    });
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      expect(screen.getByText("Garden Cove Cafe")).toBeDefined();
    });
  });

  it("loads the next cursor page on demand", async () => {
    mockApi(url => {
      if (url.pathname === "/api/listings/categories") {
        return jsonResponse({ items: ["Cafe"] }, 200);
      }
      if (url.searchParams.get("cursor") === "lst_1") {
        return jsonResponse(
          { items: [listing("lst_2", "Sunrise Roastery")], nextCursor: null },
          200
        );
      }
      return jsonResponse(
        { items: [listing("lst_1", "Garden Cove Cafe")], nextCursor: "lst_1" },
        200
      );
    });

    renderDiscovery();

    await waitFor(() => {
      expect(screen.getByText("Garden Cove Cafe")).toBeDefined();
    });
    expect(screen.queryByText("Sunrise Roastery")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Load more" }));

    await waitFor(() => {
      expect(screen.getByText("Sunrise Roastery")).toBeDefined();
    });
  });

  it("renders a visible degraded state for the map when Google Maps API key is absent without gating the textual directory", async () => {
    const originalKey = env.VITE_GOOGLE_MAPS_API_KEY;
    env.VITE_GOOGLE_MAPS_API_KEY = undefined;
    try {
      mockApi(url => {
        if (url.pathname === "/api/listings/categories") {
          return jsonResponse({ items: ["Cafe"] }, 200);
        }
        return jsonResponse(
          {
            items: [listing("lst_1", "Resilient Kopitiam")],
            nextCursor: null,
          },
          200
        );
      });

      renderDiscovery();

      // Directory list renders immediately
      await waitFor(() => {
        expect(screen.getByText("Resilient Kopitiam")).toBeDefined();
      });

      // Map panel degrades visibly with an honest message
      await waitFor(() => {
        expect(screen.getByText("Map unavailable")).toBeDefined();
      });
      expect(
        screen.getByText(/Google Maps API key is not configured|could not be loaded/iu)
      ).toBeDefined();
    } finally {
      env.VITE_GOOGLE_MAPS_API_KEY = originalKey;
    }
  });
});
