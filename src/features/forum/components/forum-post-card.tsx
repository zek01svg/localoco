import type { ForumPostItem } from "#shared/contracts/forum";

import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { Edit2, MessageSquare, MoreVertical, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { LikeButton } from "#client/components/like-button";
import { Avatar, AvatarFallback, AvatarImage } from "#client/components/ui/avatar";
import { Badge } from "#client/components/ui/badge";
import { Button } from "#client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#client/components/ui/dropdown-menu";
import { useSession } from "#client/features/auth";
import { useToggleForumPostLikeMutation } from "#client/features/likes";
import { initialsOf } from "#client/features/profiles/initials";

interface ForumPostCardProps {
  post: ForumPostItem;
  currentUserId?: string;
  isAdmin?: boolean;
  onEdit?: (post: ForumPostItem) => void;
  onDelete?: (post: ForumPostItem) => void;
  onModerate?: (post: ForumPostItem) => void;
}

export function ForumPostCard({
  post,
  currentUserId,
  isAdmin,
  onEdit,
  onDelete,
  onModerate,
}: ForumPostCardProps) {
  const { isAuthenticated, isVerified } = useSession();
  const likeMutation = useToggleForumPostLikeMutation(post.id);
  const isAuthor = currentUserId === post.userId;
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  const hasOptions =
    Boolean(isAuthor && (onEdit ?? onDelete)) ||
    Boolean(isAdmin && onModerate && !post.moderatedAt);

  const handleLikeToggle = async () => {
    if (!isAuthenticated) {
      toast.error("Sign in to like discussions");
      return;
    }
    if (!isVerified) {
      toast.error("Verify your email to like discussions");
      return;
    }
    try {
      await likeMutation.mutateAsync({ isLiked: post.isLiked });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update like");
    }
  };

  return (
    <article className="bg-card text-card-foreground flex flex-col gap-3 rounded-lg border p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar size="sm">
            {post.author.avatarUrl ? (
              <AvatarImage src={post.author.avatarUrl} alt={post.author.displayName} />
            ) : null}
            <AvatarFallback>{initialsOf(post.author.displayName)}</AvatarFallback>
          </Avatar>
          <div>
            <span className="text-foreground text-sm font-semibold">{post.author.displayName}</span>
            <div className="flex items-center gap-2">
              <time
                dateTime={new Date(post.createdAt).toISOString()}
                className="text-muted-foreground text-xs"
              >
                {timeAgo}
              </time>
              {post.moderatedAt ? (
                <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">
                  Moderated
                </Badge>
              ) : post.deletedAt ? (
                <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                  Deleted
                </Badge>
              ) : null}
            </div>
          </div>
        </div>

        {hasOptions ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" aria-label="Post options">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isAuthor && onEdit ? (
                <DropdownMenuItem
                  onClick={() => {
                    onEdit(post);
                  }}
                >
                  <Edit2 className="mr-2 size-4" />
                  Edit post
                </DropdownMenuItem>
              ) : null}
              {isAuthor && onDelete ? (
                <DropdownMenuItem
                  onClick={() => {
                    onDelete(post);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete post
                </DropdownMenuItem>
              ) : null}
              {isAdmin && onModerate && !post.moderatedAt ? (
                <DropdownMenuItem
                  onClick={() => {
                    onModerate(post);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <ShieldAlert className="mr-2 size-4" />
                  Moderate post
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Link
          to="/forum/$postId"
          params={{ postId: post.id }}
          className="text-foreground hover:underline"
        >
          <h2 className="font-display text-lg tracking-tight">{post.title}</h2>
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{post.business.name}</Badge>
          {post.business.category ? (
            <span className="text-muted-foreground text-xs">{post.business.category}</span>
          ) : null}
        </div>
      </div>

      <p className="text-foreground line-clamp-2 text-sm leading-relaxed break-words whitespace-pre-wrap">
        {post.body}
      </p>

      <div className="flex items-center justify-between border-t pt-2">
        <div className="flex items-center gap-3">
          <LikeButton
            isLiked={post.isLiked}
            likeCount={post.likeCount}
            onToggle={() => {
              void handleLikeToggle();
            }}
            isPending={likeMutation.isPending}
            disabled={!isAuthenticated || !isVerified}
            ariaLabel={post.isLiked ? "Unlike post" : "Like post"}
          />
          <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
            <MessageSquare className="size-3.5" />
            {post.replyCount === 1 ? "1 reply" : `${post.replyCount} replies`}
          </span>
        </div>

        <Link
          to="/forum/$postId"
          params={{ postId: post.id }}
          className="text-muted-foreground hover:text-foreground inline-flex items-center text-xs font-medium"
        >
          View discussion
        </Link>
      </div>
    </article>
  );
}
