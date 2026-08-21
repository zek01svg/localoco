import type { ReviewItem } from "#shared/contracts/reviews";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ReviewCard } from "#client/features/reviews/components/review-card";
import { ReviewDialog } from "#client/features/reviews/components/review-dialog";

const { mockUseSession } = vi.hoisted(() => ({
  mockUseSession: vi.fn<() => unknown>(),
}));

vi.mock("#client/lib/auth", () => ({
  auth: {
    useSession: () => mockUseSession(),
    signOut: vi.fn<() => Promise<unknown>>(),
  },
}));

function stubSession(userOverride?: { id?: string; emailVerified?: boolean } | null) {
  const user =
    userOverride === null
      ? null
      : {
          id: userOverride?.id ?? "usr_1",
          name: "Alice Tan",
          email: "alice@example.com",
          emailVerified: userOverride?.emailVerified ?? true,
        };
  const session = user ? { id: "sess_1" } : null;
  mockUseSession.mockReturnValue({
    session,
    user,
    data: { session, user },
    isPending: false,
    error: null,
    isAuthenticated: Boolean(session && user),
    isVerified: Boolean(user?.emailVerified),
  });
}

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("ReviewCard component", () => {
  beforeEach(() => {
    stubSession();
  });
  afterEach(cleanup);

  const mockReview: ReviewItem = {
    id: "rev_1",
    businessId: "biz_1",
    userId: "usr_1",
    rating: 5,
    content: "Delicious prata and great teh tarik!",
    author: {
      id: "usr_1",
      displayName: "Alice Tan",
      avatarUrl: null,
    },
    likeCount: 0,
    isLiked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("renders author name, rating, and content", () => {
    renderWithQueryClient(<ReviewCard review={mockReview} />);
    expect(screen.getByText("Alice Tan")).toBeDefined();
    expect(screen.getByText("Delicious prata and great teh tarik!")).toBeDefined();
  });

  it("renders options button when viewer is author", () => {
    const handleEdit = vi.fn<(_review: ReviewItem) => void>();
    const handleDelete = vi.fn<(_review: ReviewItem) => void>();

    renderWithQueryClient(
      <ReviewCard
        review={mockReview}
        currentUserId="usr_1"
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    );

    const optionsBtn = screen.getByRole("button", { name: /Review options/iu });
    expect(optionsBtn).toBeDefined();
  });
});

describe("ReviewDialog component — write mode", () => {
  afterEach(cleanup);

  it("validates empty content and prevents submission", () => {
    const handleSubmit = vi.fn<(_data: { rating: number; content: string }) => Promise<void>>();
    render(
      <ReviewDialog open={true} onOpenChange={() => {}} onSubmit={handleSubmit} isPending={false} />
    );

    const submitBtn = screen.getByRole("button", { name: /Publish Review/iu });
    expect(submitBtn.hasAttribute("disabled")).toBe(true);
  });

  it("allows entering feedback and submitting", () => {
    const handleSubmit = vi
      .fn<(_data: { rating: number; content: string }) => Promise<void>>()
      .mockResolvedValue();
    render(
      <ReviewDialog open={true} onOpenChange={() => {}} onSubmit={handleSubmit} isPending={false} />
    );

    const textarea = screen.getByPlaceholderText(/What did you think/iu);
    fireEvent.change(textarea, { target: { value: "Wonderful ambiance and great coffee!" } });

    const submitBtn = screen.getByRole("button", { name: /Publish Review/iu });
    expect(submitBtn.hasAttribute("disabled")).toBe(false);
    fireEvent.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledWith({
      rating: 5,
      content: "Wonderful ambiance and great coffee!",
    });
  });
});

describe("ReviewDialog component — edit mode", () => {
  afterEach(cleanup);

  it("pre-fills values and displays 'Edit your review'", () => {
    const existingReview = {
      id: "rev_1",
      businessId: "biz_1",
      userId: "usr_1",
      rating: 4,
      content: "Initial feedback",
      author: { id: "usr_1", displayName: "Alice", avatarUrl: null },
      likeCount: 0,
      isLiked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const handleSubmit = vi.fn<(_data: { rating: number; content: string }) => Promise<void>>();

    render(
      <ReviewDialog
        open={true}
        onOpenChange={() => {}}
        reviewToEdit={existingReview}
        onSubmit={handleSubmit}
        isPending={false}
      />
    );

    expect(screen.getByText("Edit your review")).toBeDefined();
    expect(screen.getByDisplayValue("Initial feedback")).toBeDefined();
    expect(screen.getByRole("button", { name: /Update Review/iu })).toBeDefined();
  });
});
