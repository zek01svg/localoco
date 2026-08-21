import type { OwnerListing } from "#shared/contracts/listings";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BusinessListingPage } from "#client/features/businesses/business-listing-page";
import { ListingNotFoundError } from "#client/features/businesses/hooks/business-queries";

const { mockUseSession, mockListingQuery, mockSubmitListingMutate, mockUpdateListingMutate } =
  vi.hoisted(() => ({
    mockUseSession: vi.fn<() => unknown>(),
    mockListingQuery: vi.fn<() => unknown>(),
    mockSubmitListingMutate: vi.fn<() => void>(),
    mockUpdateListingMutate: vi.fn<() => void>(),
  }));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn<() => void>(),
  Link: ({
    children,
    to,
    className,
  }: {
    children: React.ReactNode;
    to: string;
    className?: string;
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
}));

vi.mock("#client/features/auth", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("#client/features/businesses/hooks/business-queries", () => ({
  ListingNotFoundError: class MockListingNotFoundError extends Error {
    constructor() {
      super("Listing not found");
      this.name = "ListingNotFoundError";
    }
  },
  useOwnedListingQuery: (_id: string, _enabled: boolean) => mockListingQuery(),
  useSubmitListingMutation: (_id: string) => ({
    mutate: mockSubmitListingMutate,
    isPending: false,
    error: null,
  }),
  useUpdateListingMutation: (_id: string) => ({
    mutate: mockUpdateListingMutate,
    isPending: false,
    error: null,
  }),
}));

vi.mock("#client/features/businesses/hooks/photo-queries", () => ({
  useListingPhotosQuery: () => ({ data: { items: [] }, isPending: false, error: null }),
  useUploadListingPhotoMutation: () => ({
    mutate: vi.fn<() => void>(),
    isPending: false,
    error: null,
  }),
  useDeleteListingPhotoMutation: () => ({
    mutate: vi.fn<() => void>(),
    isPending: false,
    error: null,
  }),
}));

vi.mock("#client/features/announcements", () => ({
  BusinessAnnouncementsSection: () => <div data-testid="announcements-section" />,
}));

vi.mock("#client/features/events", () => ({
  BusinessEventsSection: () => <div data-testid="events-section" />,
}));

vi.mock("#client/features/reviews", () => ({
  BusinessReviewsSection: () => <div data-testid="reviews-section" />,
}));

const sampleListing: OwnerListing = {
  id: "biz_1",
  name: "Kopitiam Hub",
  category: "Food & Beverage",
  address: "100 Jurong East Ave",
  postalCode: "609601",
  phone: "+65 6123 4567",
  email: "contact@kopitiamhub.sg",
  website: "https://kopitiamhub.sg",
  priceRange: "$10–$20",
  paymentOptions: ["Cash", "PayNow"],
  latitude: 1.333,
  longitude: 103.742,
  status: "draft",
  rejectionReason: null,
  hours: [],
};

function stubSession(verified = true) {
  const user = { id: "usr_1", emailVerified: verified };
  const session = { id: "sess_1" };
  mockUseSession.mockReturnValue({
    session,
    user,
    data: { session, user },
    isPending: false,
    error: null,
    isAuthenticated: true,
    isVerified: verified,
  });
}

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("BusinessListingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubSession(true);
  });

  afterEach(cleanup);

  it("renders loading skeleton while query is pending", () => {
    mockListingQuery.mockReturnValue({
      data: undefined,
      isPending: true,
      error: null,
    });

    const { container } = renderWithClient(<BusinessListingPage businessId="biz_1" />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders not found page when query throws ListingNotFoundError", () => {
    mockListingQuery.mockReturnValue({
      data: undefined,
      isPending: false,
      error: new ListingNotFoundError(),
    });

    renderWithClient(<BusinessListingPage businessId="biz_1" />);
    expect(screen.getByText(/page not found/iu)).toBeInTheDocument();
  });

  it("renders generic error card when query fails with other error", () => {
    mockListingQuery.mockReturnValue({
      data: undefined,
      isPending: false,
      error: new Error("Network timeout"),
    });

    renderWithClient(<BusinessListingPage businessId="biz_1" />);
    expect(screen.getByText("Could not load your listing")).toBeInTheDocument();
    expect(screen.getByText("Network timeout")).toBeInTheDocument();
  });

  it("renders Draft banner and submits listing for review when clicked", () => {
    mockListingQuery.mockReturnValue({
      data: { ...sampleListing, status: "draft" },
      isPending: false,
      error: null,
    });

    renderWithClient(<BusinessListingPage businessId="biz_1" />);

    expect(screen.getByText("Draft")).toBeInTheDocument();
    const submitBtn = screen.getByRole("button", { name: "Submit for review" });
    expect(submitBtn).toBeInTheDocument();

    fireEvent.click(submitBtn);
    expect(mockSubmitListingMutate).toHaveBeenCalledTimes(1);
  });

  it("renders Pending Review banner when listing status is pending_review", () => {
    mockListingQuery.mockReturnValue({
      data: { ...sampleListing, status: "pending_review" },
      isPending: false,
      error: null,
    });

    renderWithClient(<BusinessListingPage businessId="biz_1" />);
    expect(screen.getByText("Pending Review")).toBeInTheDocument();
    expect(
      screen.getByText(/An administrator is currently reviewing your listing/iu)
    ).toBeInTheDocument();
  });

  it("renders Published banner when listing status is published", () => {
    mockListingQuery.mockReturnValue({
      data: { ...sampleListing, status: "published" },
      isPending: false,
      error: null,
    });

    renderWithClient(<BusinessListingPage businessId="biz_1" />);
    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(screen.getByText(/Your listing is live in public discovery/iu)).toBeInTheDocument();
  });

  it("renders Changes Required banner with reason when status is rejected", () => {
    mockListingQuery.mockReturnValue({
      data: {
        ...sampleListing,
        status: "rejected",
        rejectionReason: "Please provide complete opening hours.",
      },
      isPending: false,
      error: null,
    });

    renderWithClient(<BusinessListingPage businessId="biz_1" />);
    expect(screen.getByText("Changes Required")).toBeInTheDocument();
    expect(screen.getByText(/Reason: Please provide complete opening hours/iu)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit for review" })).toBeInTheDocument();
  });

  it("renders Suspended banner when listing status is suspended", () => {
    mockListingQuery.mockReturnValue({
      data: {
        ...sampleListing,
        status: "suspended",
      },
      isPending: false,
      error: null,
    });

    renderWithClient(<BusinessListingPage businessId="biz_1" />);
    expect(screen.getByText("Suspended")).toBeInTheDocument();
    expect(
      screen.getByText(/This listing has been suspended by an administrator/iu)
    ).toBeInTheDocument();
  });
});
