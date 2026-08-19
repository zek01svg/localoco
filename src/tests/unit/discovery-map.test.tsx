import type { Listing } from "#shared/contracts/listings";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { env } from "#client/env";
import { DiscoveryMap } from "#client/features/discovery/components/discovery-map";

const sampleListings: Listing[] = [
  {
    id: "lst_1",
    name: "Marina Bay Bakery",
    category: "Bakery",
    address: "10 Bayfront Avenue",
    postalCode: "018956",
    phone: null,
    email: null,
    website: null,
    paymentOptions: null,
    priceRange: null,
    latitude: 1.284,
    longitude: 103.858,
  },
  {
    id: "lst_2",
    name: "Orchard Cafe",
    category: "Cafe",
    address: "2 Orchard Turn",
    postalCode: "238801",
    phone: null,
    email: null,
    website: null,
    paymentOptions: null,
    priceRange: null,
    latitude: 1.305,
    longitude: 103.832,
  },
  {
    id: "lst_3",
    name: "No Coords Shop",
    category: "Retail",
    address: "99 Old Road",
    postalCode: "123456",
    phone: null,
    email: null,
    website: null,
    paymentOptions: null,
    priceRange: null,
    latitude: null,
    longitude: null,
  },
];

describe("DiscoveryMap", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders honest visible degraded state when Google Maps API key is missing", () => {
    const originalKey = env.VITE_GOOGLE_MAPS_API_KEY;
    env.VITE_GOOGLE_MAPS_API_KEY = undefined;

    try {
      render(
        <DiscoveryMap
          items={sampleListings}
          activeBounds={null}
          onBoundsChange={vi.fn<() => void>()}
          selectedId={null}
          onSelectListing={vi.fn<() => void>()}
        />
      );

      expect(screen.getByRole("region", { name: "Map status" })).toBeDefined();
      expect(screen.getByText("Map unavailable")).toBeDefined();
      expect(screen.getByText(/Google Maps API key is not configured/iu)).toBeDefined();
    } finally {
      env.VITE_GOOGLE_MAPS_API_KEY = originalKey;
    }
  });

  it("renders reset map filter control when active bounds are present", () => {
    // When an API key is set, mock @vis.gl/react-google-maps to test UI controls
    const originalKey = env.VITE_GOOGLE_MAPS_API_KEY;
    env.VITE_GOOGLE_MAPS_API_KEY = "mock_browser_maps_key";

    const onBoundsChange = vi.fn<() => void>();
    const bounds = { north: 1.31, south: 1.27, east: 103.87, west: 103.82 };

    try {
      render(
        <DiscoveryMap
          items={sampleListings}
          activeBounds={bounds}
          onBoundsChange={onBoundsChange}
          selectedId={null}
          onSelectListing={vi.fn<() => void>()}
        />
      );

      const resetButton = screen.getByRole("button", { name: /reset map filter/iu });
      expect(resetButton).toBeDefined();

      fireEvent.click(resetButton);
      expect(onBoundsChange).toHaveBeenCalledWith(null);
    } finally {
      env.VITE_GOOGLE_MAPS_API_KEY = originalKey;
    }
  });
});
