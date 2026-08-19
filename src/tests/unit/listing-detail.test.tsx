import type { PublicListingDetail } from "#shared/contracts/listings";

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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ListingDetailPage } from "#client/features/listings";
import { ListingContactInfo } from "#client/features/listings/components/listing-contact-info";
import {
  buildSchemaOrgJsonLd,
  ListingStructuredData,
} from "#client/features/listings/components/listing-structured-data";

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

const mockFullListing: PublicListingDetail = {
  id: "lst_sample_123",
  businessId: "biz_sample_123",
  uen: "202412345A",
  name: "Tanjong Pagar Artisan Bakery",
  category: "Bakery",
  description:
    "Artisanal sourdough and authentic French pastries baked fresh every morning in Singapore.",
  address: "120 Tanjong Pagar Road",
  postalCode: "088532",
  latitude: 1.2789,
  longitude: 103.8432,
  phone: "+65 6123 4567",
  email: "hello@tanjongbakery.sg",
  website: "https://tanjongbakery.sg",
  paymentOptions: ["Cash", "PayNow", "NETS", "Visa", "Mastercard"],
  priceRange: "$$ ($10–$30)",
  hours: [
    { day: 0, is24h: false, openTime: "08:00", closeTime: "18:00" },
    { day: 1, is24h: true },
    { day: 2, is24h: false, openTime: "18:00", closeTime: "02:00" },
  ],
  photos: [
    {
      id: "photo_1",
      contentType: "image/jpeg",
      size: 150000,
      url: "/api/media/photo_1",
    },
    {
      id: "photo_2",
      contentType: "image/jpeg",
      size: 180000,
      url: "/api/media/photo_2",
    },
  ],
};

const mockMinimalListing: PublicListingDetail = {
  id: "lst_min_456",
  businessId: "biz_min_456",
  uen: "202498765Z",
  name: "Simple Kiosk",
  category: "Retail",
  description: null,
  address: "1 Simple Way",
  postalCode: "111222",
  latitude: null,
  longitude: null,
  phone: null,
  email: null,
  website: null,
  paymentOptions: null,
  priceRange: null,
  hours: [],
  photos: [],
};

function renderListingDetail(listingId: string) {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const listingDetailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/listings/$id",
    component: () => <ListingDetailPage listingId={listingId} />,
  });

  const router = createRouter({
    routeTree: rootRoute.addChildren([listingDetailRoute]),
    history: createMemoryHistory({ initialEntries: [`/listings/${listingId}`] }),
  });

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

describe("ListingDetailPage component", () => {
  beforeEach(() => {
    stubBrowser();
  });

  afterEach(() => {
    unstubBrowser();
  });

  it("renders loading skeleton while query is pending", async () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));
    renderListingDetail("lst_sample_123");

    await waitFor(() => {
      expect(screen.getByLabelText("Loading listing details")).toBeDefined();
    });
  });

  it("renders full listing details and metadata cleanly", async () => {
    fetchMock.mockResolvedValue(jsonResponse(mockFullListing, 200));
    renderListingDetail("lst_sample_123");

    // Title and Header
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Tanjong Pagar Artisan Bakery" })
      ).toBeDefined();
    });

    expect(document.title).toBe("Tanjong Pagar Artisan Bakery — LocaLoco");
    expect(screen.getByText("Bakery")).toBeDefined();
    expect(screen.getByText("UEN: 202412345A")).toBeDefined();

    // Description
    expect(screen.getByRole("heading", { level: 2, name: "About" })).toBeDefined();
    expect(screen.getByText(/Artisanal sourdough/u)).toBeDefined();

    // Address & Location
    expect(screen.getByText("120 Tanjong Pagar Road")).toBeDefined();
    expect(screen.getByText("Singapore 088532")).toBeDefined();

    // Contact Options
    const phoneLink = screen.getByLabelText("Call Tanjong Pagar Artisan Bakery at +65 6123 4567");
    expect(phoneLink.getAttribute("href")).toBe("tel:+6561234567");

    const emailLink = screen.getByLabelText(
      "Email Tanjong Pagar Artisan Bakery at hello@tanjongbakery.sg"
    );
    expect(emailLink.getAttribute("href")).toBe("mailto:hello@tanjongbakery.sg");

    const websiteLink = screen.getByLabelText(
      "Visit official website for Tanjong Pagar Artisan Bakery (opens in new tab)"
    );
    expect(websiteLink.getAttribute("href")).toBe("https://tanjongbakery.sg");
    expect(websiteLink.getAttribute("target")).toBe("_blank");

    // Payment Options & Price
    expect(screen.getByText("PayNow")).toBeDefined();
    expect(screen.getByText("Visa")).toBeDefined();
    expect(screen.getByText("$$ ($10–$30)")).toBeDefined();

    // Opening Hours
    expect(screen.getByRole("heading", { level: 2, name: "Opening Hours" })).toBeDefined();
    expect(screen.getByText("08:00 – 18:00")).toBeDefined();
    expect(screen.getByText("Open 24 hours")).toBeDefined();
    expect(screen.getByText("18:00 – 02:00 (next day)")).toBeDefined();

    // Photo Gallery
    const mainImg = screen.getByAltText("Tanjong Pagar Artisan Bakery (1 of 2)");
    expect(mainImg.getAttribute("src")).toBe("/api/media/photo_1");

    // Thumbnail navigation
    const nextBtn = screen.getByLabelText("Next photo");
    fireEvent.click(nextBtn);

    const nextImg = screen.getByAltText("Tanjong Pagar Artisan Bakery (2 of 2)");
    expect(nextImg.getAttribute("src")).toBe("/api/media/photo_2");
  });

  it("navigates photos via thumbnails and prev/next controls", async () => {
    fetchMock.mockResolvedValue(jsonResponse(mockFullListing, 200));
    renderListingDetail("lst_sample_123");

    await waitFor(() => {
      expect(screen.getByAltText("Tanjong Pagar Artisan Bakery (1 of 2)")).toBeDefined();
    });

    const secondThumb = screen.getByLabelText("View photo 2 of 2");
    fireEvent.click(secondThumb);
    expect(screen.getByAltText("Tanjong Pagar Artisan Bakery (2 of 2)")).toBeDefined();

    const prevBtn = screen.getByLabelText("Previous photo");
    fireEvent.click(prevBtn);
    expect(screen.getByAltText("Tanjong Pagar Artisan Bakery (1 of 2)")).toBeDefined();
  });

  it("renders minimal listing with deliberate empty states", async () => {
    fetchMock.mockResolvedValue(jsonResponse(mockMinimalListing, 200));
    renderListingDetail("lst_min_456");

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Simple Kiosk" })).toBeDefined();
    });

    // Deliberate empty states
    expect(screen.queryByRole("heading", { level: 2, name: "About" })).toBeNull();
    expect(screen.getByText("No photos uploaded for this listing yet")).toBeDefined();
    expect(screen.getByText("No contact information provided yet.")).toBeDefined();
    expect(screen.getByText("Hours not provided")).toBeDefined();
    expect(screen.getByText("Map coordinates not available for this listing")).toBeDefined();
  });

  it("renders 404 not found page for missing listing", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "not_found",
            message: "Listing not found",
          },
        },
        404
      )
    );

    renderListingDetail("lst_non_existent");

    await waitFor(() => {
      expect(screen.getByText("Page not found")).toBeDefined();
    });
  });

  it("renders error card with retry button on server error", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "dependency_unavailable",
            message: "Listings are temporarily unavailable. Try again shortly.",
          },
        },
        503
      )
    );

    renderListingDetail("lst_err");

    await waitFor(() => {
      expect(screen.getByText("Could not load listing")).toBeDefined();
      expect(
        screen.getByText("Listings are temporarily unavailable. Try again shortly.")
      ).toBeDefined();
      expect(screen.getByRole("button", { name: "Try again" })).toBeDefined();
    });
  });
});

describe("buildSchemaOrgJsonLd", () => {
  it("builds compliant Schema.org LocalBusiness JSON-LD structure", () => {
    const jsonLd = buildSchemaOrgJsonLd(mockFullListing);

    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("LocalBusiness");
    expect(jsonLd.name).toBe("Tanjong Pagar Artisan Bakery");
    expect(jsonLd.identifier).toBe("202412345A");
    expect(jsonLd.taxID).toBe("202412345A");
    expect(jsonLd.description).toBe(mockFullListing.description);

    expect(jsonLd.address).toEqual({
      "@type": "PostalAddress",
      streetAddress: "120 Tanjong Pagar Road",
      postalCode: "088532",
      addressCountry: "SG",
      addressLocality: "Singapore",
    });

    expect(jsonLd.geo).toEqual({
      "@type": "GeoCoordinates",
      latitude: 1.2789,
      longitude: 103.8432,
    });

    expect(jsonLd.telephone).toBe("+65 6123 4567");
    expect(jsonLd.email).toBe("hello@tanjongbakery.sg");
    expect(jsonLd.url).toBe("https://tanjongbakery.sg");
    expect(jsonLd.priceRange).toBe("$$ ($10–$30)");
    expect(jsonLd.paymentAccepted).toBe("Cash, PayNow, NETS, Visa, Mastercard");

    expect(jsonLd.openingHoursSpecification).toHaveLength(3);
    expect(jsonLd.openingHoursSpecification?.[0]).toEqual({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "https://schema.org/Monday",
      opens: "08:00",
      closes: "18:00",
    });
    expect(jsonLd.openingHoursSpecification?.[1]).toEqual({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "https://schema.org/Tuesday",
      opens: "00:00",
      closes: "23:59",
    });

    expect(jsonLd.image).toEqual(["/api/media/photo_1", "/api/media/photo_2"]);
  });

  it("handles minimal listing without throwing and omits absent optional fields", () => {
    const jsonLd = buildSchemaOrgJsonLd(mockMinimalListing);

    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("LocalBusiness");
    expect(jsonLd.name).toBe("Simple Kiosk");
    expect(jsonLd.identifier).toBe("202498765Z");
    expect(jsonLd.description).toBeUndefined();
    expect(jsonLd.geo).toBeUndefined();
    expect(jsonLd.telephone).toBeUndefined();
    expect(jsonLd.email).toBeUndefined();
    expect(jsonLd.url).toBeUndefined();
    expect(jsonLd.priceRange).toBeUndefined();
    expect(jsonLd.paymentAccepted).toBeUndefined();
    expect(jsonLd.openingHoursSpecification).toBeUndefined();
    expect(jsonLd.image).toBeUndefined();
  });

  it("sanitizes JSON-LD output against XSS injection (<script> tags)", () => {
    const maliciousListing: PublicListingDetail = {
      ...mockFullListing,
      name: "</script><script>alert(1)</script>",
      description: "</script><script>alert('xss')</script>",
    };
    const { container } = render(<ListingStructuredData listing={maliciousListing} />);
    const scriptEl = container.querySelector('script[type="application/ld+json"]');
    expect(scriptEl).not.toBeNull();
    expect(scriptEl?.innerHTML).not.toContain("</script>");
    expect(scriptEl?.innerHTML).toContain("\\u003c/script>");
  });

  it("sanitizes malicious javascript: URLs in contact info", () => {
    const maliciousContactListing: PublicListingDetail = {
      ...mockFullListing,
      website: "javascript:alert(document.cookie)",
    };
    render(<ListingContactInfo listing={maliciousContactListing} />);
    const link = screen.queryByLabelText(/Visit official website/iu);
    expect(link).toBeNull();
  });
});
