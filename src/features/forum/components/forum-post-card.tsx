import type { ForumPostItem } from "#shared/contracts/forum";

import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { Edit2, MessageSquare, MoreVertical, Trash2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "#client/components/ui/avatar";
import { Badge } from "#client/components/ui/badge";
import { Button } from "#client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#client/components/ui/dropdown-menu";
import { initialsOf } from "#client/features/profiles/initials";

interface ForumPostCardProps {
  post: ForumPostItem;
  currentUserId?: string;
  onEdit?: (post: ForumPostItem) => void;
  onDelete?: (post: ForumPostItem) => void;
}

export function ForumPostCard({ post, currentUserId, onEdit, onDelete }: ForumPostCardProps) {
  const isAuthor = currentUserId === post.userId;
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });

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
            </div>
          </div>
        </div>

        {isAuthor && (onEdit || onDelete) ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" aria-label="Post options">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit ? (
                <DropdownMenuItem
                  onClick={() => {
                    onEdit(post);
                  }}
                >
                  <Edit2 className="mr-2 size-4" />
                  Edit post
                </DropdownMenuItem>
              ) : null}
              {onDelete ? (
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
          <h2 className="text-lg font-semibold tracking-tight">{post.title}</h2>
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

      <Link
        to="/forum/$postId"
        params={{ postId: post.id }}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs"
      >
        <MessageSquare className="size-3.5" />
        {post.replyCount === 1 ? "1 reply" : `${post.replyCount} replies`}
        <span aria-hidden="true">·</span>
        View discussion
      </Link>
    </article>
  );
}
