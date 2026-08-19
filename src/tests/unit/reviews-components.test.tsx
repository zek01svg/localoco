import type { ReviewItem } from "#shared/contracts/reviews";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReviewCard } from "#client/features/reviews/components/review-card";
import { ReviewDialog } from "#client/features/reviews/components/review-dialog";

describe("ReviewCard component", () => {
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("renders author name, rating, and content", () => {
    render(<ReviewCard review={mockReview} />);
    expect(screen.getByText("Alice Tan")).toBeDefined();
    expect(screen.getByText("Delicious prata and great teh tarik!")).toBeDefined();
  });

  it("renders options button when viewer is author", () => {
    const handleEdit = vi.fn<(_review: ReviewItem) => void>();
    const handleDelete = vi.fn<(_review: ReviewItem) => void>();

    render(
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
