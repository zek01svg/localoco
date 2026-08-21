import type { ReviewItem } from "#shared/contracts/reviews";

import { formatDistanceToNow } from "date-fns";
import { Edit2, MoreVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { LikeButton } from "#client/components/like-button";
import { StarRating } from "#client/components/star-rating";
import { Avatar, AvatarFallback, AvatarImage } from "#client/components/ui/avatar";
import { Button } from "#client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#client/components/ui/dropdown-menu";
import { useSession } from "#client/features/auth";
import { useToggleReviewLikeMutation } from "#client/features/likes";
import { initialsOf } from "#client/features/profiles/initials";

interface ReviewCardProps {
  review: ReviewItem;
  currentUserId?: string;
  isAdmin?: boolean;
  onEdit?: (review: ReviewItem) => void;
  onDelete?: (review: ReviewItem) => void;
}

export function ReviewCard({
  review,
  currentUserId,
  isAdmin = false,
  onEdit,
  onDelete,
}: ReviewCardProps) {
  const { isAuthenticated, isVerified } = useSession();
  const likeMutation = useToggleReviewLikeMutation(review.businessId);

  const isAuthor = currentUserId === review.userId;
  const canModify = isAuthor || isAdmin;

  const timeAgo = formatDistanceToNow(new Date(review.createdAt), { addSuffix: true });

  const handleLikeToggle = async () => {
    if (!isAuthenticated) {
      toast.error("Sign in to like reviews");
      return;
    }
    if (!isVerified) {
      toast.error("Verify your email to like reviews");
      return;
    }
    try {
      await likeMutation.mutateAsync({ reviewId: review.id, isLiked: review.isLiked });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update like");
    }
  };

  return (
    <article className="bg-card text-card-foreground flex flex-col gap-3 rounded-lg border p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar size="sm">
            {review.author.avatarUrl ? (
              <AvatarImage src={review.author.avatarUrl} alt={review.author.displayName} />
            ) : null}
            <AvatarFallback>{initialsOf(review.author.displayName)}</AvatarFallback>
          </Avatar>
          <div>
            <span className="text-foreground text-sm font-semibold">
              {review.author.displayName}
            </span>
            <div className="flex items-center gap-2">
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

        {canModify && (onEdit || onDelete) ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" aria-label="Review options">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isAuthor && onEdit ? (
                <DropdownMenuItem
                  onClick={() => {
                    onEdit(review);
                  }}
                >
                  <Edit2 className="mr-2 size-4" />
                  Edit review
                </DropdownMenuItem>
              ) : null}
              {onDelete ? (
                <DropdownMenuItem
                  onClick={() => {
                    onDelete(review);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete review
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <p className="text-foreground text-sm leading-relaxed break-words whitespace-pre-wrap">
        {review.content}
      </p>

      <div className="flex items-center justify-start border-t pt-2">
        <LikeButton
          isLiked={review.isLiked}
          likeCount={review.likeCount}
          onToggle={() => {
            void handleLikeToggle();
          }}
          isPending={likeMutation.isPending}
          disabled={!isAuthenticated || !isVerified}
          ariaLabel={review.isLiked ? "Unlike review" : "Like review"}
        />
      </div>
    </article>
  );
}
