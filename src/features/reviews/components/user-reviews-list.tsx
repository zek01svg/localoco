import type { ReviewItem } from "#shared/contracts/reviews";

import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";

import { StarRating } from "#client/components/star-rating";
import { Button } from "#client/components/ui/button";
import { Skeleton } from "#client/components/ui/skeleton";

import { useUserReviewsQuery } from "../hooks/use-reviews";

interface UserReviewsListProps {
  userId: string;
  userName: string;
}

function UserReviewCard({ review }: { review: ReviewItem }) {
  const timeAgo = formatDistanceToNow(new Date(review.createdAt), { addSuffix: true });

  return (
    <article className="bg-card text-card-foreground flex flex-col gap-2 rounded-lg border p-4 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <div>
          {review.business ? (
            <Link
              to="/businesses/$id"
              params={{ id: review.businessId }}
              className="text-foreground hover:text-primary text-sm font-semibold hover:underline"
            >
              {review.business.name}
            </Link>
          ) : (
            <span className="text-foreground text-sm font-semibold">Business</span>
          )}
          <div className="mt-0.5 flex items-center gap-2">
            <StarRating rating={review.rating} size="sm" />
            <span className="text-muted-foreground text-xs">•</span>
            <time
              dateTime={new Date(review.createdAt).toISOString()}
              className="text-muted-foreground text-xs"
            >
              {timeAgo}
            </time>
          </div>
        </div>
      </div>

      <p className="text-foreground text-sm leading-relaxed break-words whitespace-pre-wrap">
        {review.content}
      </p>
    </article>
  );
}

export function UserReviewsList({ userId, userName }: UserReviewsListProps) {
  const { data, isPending, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useUserReviewsQuery(userId);

  const allReviews: ReviewItem[] = data ? data.pages.flatMap(page => page.items) : [];

  return (
    <section
      className="mt-8 flex w-full max-w-2xl flex-col gap-4"
      aria-labelledby="user-reviews-heading"
    >
      <h2
        id="user-reviews-heading"
        className="text-foreground text-lg font-semibold tracking-tight"
      >
        Reviews by {userName}
      </h2>

      {isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      ) : error ? (
        <div className="bg-muted/50 rounded-lg border p-4 text-center">
          <p className="text-muted-foreground text-sm">Could not load reviews at this time.</p>
        </div>
      ) : allReviews.length === 0 ? (
        <div className="bg-muted/30 rounded-lg border border-dashed p-6 text-center">
          <p className="text-muted-foreground text-sm">No reviews published yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {allReviews.map(rev => (
            <UserReviewCard key={rev.id} review={rev} />
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
    </section>
  );
}
