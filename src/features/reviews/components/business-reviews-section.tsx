import type { ReviewItem } from "#shared/contracts/reviews";

import { MessageSquarePlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { StarRating } from "#client/components/star-rating";
import { Button } from "#client/components/ui/button";
import { Skeleton } from "#client/components/ui/skeleton";
import { useSession } from "#client/features/auth";

import {
  useBusinessReviewsQuery,
  useCreateReviewMutation,
  useDeleteReviewMutation,
  useUpdateReviewMutation,
} from "../hooks/use-reviews";
import { ReviewCard } from "./review-card";
import { ReviewDialog } from "./review-dialog";

interface BusinessReviewsSectionProps {
  businessId: string;
  ownerId?: string;
}

export function BusinessReviewsSection({ businessId, ownerId }: BusinessReviewsSectionProps) {
  const { user, isAuthenticated, isVerified } = useSession();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reviewToEdit, setReviewToEdit] = useState<ReviewItem | null>(null);

  const { data, isPending, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useBusinessReviewsQuery(businessId);

  const createMutation = useCreateReviewMutation(businessId);
  const updateMutation = useUpdateReviewMutation(businessId);
  const deleteMutation = useDeleteReviewMutation(businessId);

  const isOwner = Boolean(user?.id && ownerId && user.id === ownerId);

  const allReviews: ReviewItem[] = data ? data.pages.flatMap(page => page.items) : [];
  const aggregate = data?.pages[0]?.aggregate ?? { averageRating: null, totalCount: 0 };

  const userExistingReview = user ? allReviews.find(r => r.userId === user.id) : null;

  const handleOpenWrite = () => {
    setReviewToEdit(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (rev: ReviewItem) => {
    setReviewToEdit(rev);
    setDialogOpen(true);
  };

  const handleDelete = async (rev: ReviewItem) => {
    try {
      await deleteMutation.mutateAsync({ reviewId: rev.id });
      toast.success("Review deleted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete review");
    }
  };

  const handleSubmitDialog = async (formData: { rating: number; content: string }) => {
    if (reviewToEdit) {
      await updateMutation.mutateAsync({
        reviewId: reviewToEdit.id,
        data: formData,
      });
      toast.success("Review updated!");
    } else {
      await createMutation.mutateAsync(formData);
      toast.success("Review published!");
    }
  };

  return (
    <section className="flex flex-col gap-6" aria-labelledby="reviews-heading">
      <div className="flex flex-col justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center">
        <div>
          <h2 id="reviews-heading" className="font-display text-xl tracking-tight">
            Customer Reviews
          </h2>
          <div className="mt-1 flex items-center gap-2">
            <StarRating
              rating={aggregate.averageRating}
              totalCount={aggregate.totalCount}
              showScore
              showCount
              size="md"
            />
          </div>
        </div>

        {!isOwner && (
          <div>
            {isAuthenticated ? (
              isVerified ? (
                userExistingReview ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleOpenEdit(userExistingReview);
                    }}
                  >
                    Edit your review
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      handleOpenWrite();
                    }}
                  >
                    <MessageSquarePlus className="mr-2 size-4" />
                    Write a review
                  </Button>
                )
              ) : (
                <p className="text-muted-foreground text-xs">Verify your email to write a review</p>
              )
            ) : (
              <p className="text-muted-foreground text-xs">Sign in to write a review</p>
            )}
          </div>
        )}
      </div>

      {isPending ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      ) : error ? (
        <div className="bg-muted/50 rounded-lg border p-4 text-center">
          <p className="text-muted-foreground text-sm">Could not load reviews at this time.</p>
        </div>
      ) : allReviews.length === 0 ? (
        <div className="bg-muted/30 flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <p className="text-foreground text-sm font-medium">No reviews yet</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {isOwner
              ? "Reviews from customers will appear here once published."
              : "Be the first to share your experience with this business!"}
          </p>
          {!isOwner && isAuthenticated && isVerified ? (
            <Button
              size="sm"
              className="mt-4"
              onClick={() => {
                handleOpenWrite();
              }}
            >
              Write the first review
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {allReviews.map(rev => (
            <ReviewCard
              key={rev.id}
              review={rev}
              currentUserId={user?.id}
              onEdit={handleOpenEdit}
              onDelete={revToDelete => {
                void handleDelete(revToDelete);
              }}
            />
          ))}

          {hasNextPage ? (
            <div className="mt-2 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void fetchNextPage();
                }}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Loading more..." : "Load more reviews"}
              </Button>
            </div>
          ) : null}
        </div>
      )}

      <ReviewDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        reviewToEdit={reviewToEdit}
        onSubmit={handleSubmitDialog}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
    </section>
  );
}
