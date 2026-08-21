import type { ReviewItem } from "#shared/contracts/reviews";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BusinessReviewsSection } from "#client/features/reviews/components/business-reviews-section";

const {
  mockUseSession,
  mockReviewsQuery,
  mockCreateMutateAsync,
  mockUpdateMutateAsync,
  mockDeleteMutateAsync,
} = vi.hoisted(() => ({
  mockUseSession: vi.fn<() => unknown>(),
  mockReviewsQuery: vi.fn<() => unknown>(),
  mockCreateMutateAsync: vi.fn<(_args: unknown) => Promise<unknown>>(),
  mockUpdateMutateAsync: vi.fn<(_args: unknown) => Promise<unknown>>(),
  mockDeleteMutateAsync: vi.fn<(_args: unknown) => Promise<unknown>>(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn<(_msg: string) => void>(),
    error: vi.fn<(_msg: string) => void>(),
  },
}));

vi.mock("#client/features/auth", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("#client/features/reviews/hooks/use-reviews", () => ({
  useBusinessReviewsQuery: (_id: string) => mockReviewsQuery(),
  useCreateReviewMutation: (_id: string) => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
  }),
  useUpdateReviewMutation: (_id: string) => ({
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
  }),
  useDeleteReviewMutation: (_id: string) => ({
    mutateAsync: mockDeleteMutateAsync,
    isPending: false,
  }),
}));

const sampleReview: ReviewItem = {
  id: "rev_1",
  businessId: "biz_1",
  userId: "usr_reviewer",
  rating: 5,
  content: "Excellent coffee and ambience!",
  author: {
    id: "usr_reviewer",
    displayName: "Jane Doe",
    avatarUrl: null,
  },
  likeCount: 0,
  isLiked: false,
  createdAt: new Date("2026-02-01T00:00:00.000Z"),
  updatedAt: new Date("2026-02-01T00:00:00.000Z"),
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("BusinessReviewsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReviewsQuery.mockReturnValue({
      data: {
        pages: [
          {
            items: [sampleReview],
            aggregate: { averageRating: 5.0, totalCount: 1 },
          },
        ],
      },
      isPending: false,
      error: null,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn<() => void>(),
    });
  });

  afterEach(cleanup);

  it("renders customer reviews header with aggregate rating and review items", () => {
    mockUseSession.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isVerified: false,
    });

    renderWithClient(<BusinessReviewsSection businessId="biz_1" ownerId="usr_owner" />);

    expect(screen.getByRole("heading", { name: "Customer Reviews" })).toBeInTheDocument();
    expect(screen.getByText("Excellent coffee and ambience!")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("shows Sign in prompt when user is not authenticated", () => {
    mockUseSession.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isVerified: false,
    });

    renderWithClient(<BusinessReviewsSection businessId="biz_1" ownerId="usr_owner" />);

    expect(screen.getByText("Sign in to write a review")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Write a review" })).not.toBeInTheDocument();
  });

  it("shows Verify email prompt when user is authenticated but not verified", () => {
    mockUseSession.mockReturnValue({
      user: { id: "usr_unverified" },
      isAuthenticated: true,
      isVerified: false,
    });

    renderWithClient(<BusinessReviewsSection businessId="biz_1" ownerId="usr_owner" />);

    expect(screen.getByText("Verify your email to write a review")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Write a review" })).not.toBeInTheDocument();
  });

  it("hides review button when viewer is the business owner", () => {
    mockUseSession.mockReturnValue({
      user: { id: "usr_owner" },
      isAuthenticated: true,
      isVerified: true,
    });

    renderWithClient(<BusinessReviewsSection businessId="biz_1" ownerId="usr_owner" />);

    expect(screen.queryByRole("button", { name: "Write a review" })).not.toBeInTheDocument();
    expect(screen.queryByText("Sign in to write a review")).not.toBeInTheDocument();
  });

  it("shows Edit your review button when verified user has already reviewed", () => {
    mockUseSession.mockReturnValue({
      user: { id: "usr_reviewer" },
      isAuthenticated: true,
      isVerified: true,
    });

    renderWithClient(<BusinessReviewsSection businessId="biz_1" ownerId="usr_owner" />);

    expect(screen.getByRole("button", { name: "Edit your review" })).toBeInTheDocument();
  });

  it("renders empty state when there are no reviews", () => {
    mockUseSession.mockReturnValue({
      user: { id: "usr_customer" },
      isAuthenticated: true,
      isVerified: true,
    });

    mockReviewsQuery.mockReturnValue({
      data: {
        pages: [
          {
            items: [],
            aggregate: { averageRating: null, totalCount: 0 },
          },
        ],
      },
      isPending: false,
      error: null,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn<() => void>(),
    });

    renderWithClient(<BusinessReviewsSection businessId="biz_1" ownerId="usr_owner" />);

    expect(screen.getAllByText("No reviews yet").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Write the first review" })).toBeInTheDocument();
  });
});
