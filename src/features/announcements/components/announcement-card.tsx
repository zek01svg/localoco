import type { AnnouncementItem } from "#shared/contracts/announcements";

import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { Calendar, ExternalLink, MoreVertical, Pencil, Trash2 } from "lucide-react";

import { Badge } from "#client/components/ui/badge";
import { Button } from "#client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#client/components/ui/dropdown-menu";

interface AnnouncementCardProps {
  announcement: AnnouncementItem;
  isOwner?: boolean;
  onEdit?: (announcement: AnnouncementItem) => void;
  onDelete?: (announcement: AnnouncementItem) => void;
}

export function AnnouncementCard({
  announcement,
  isOwner,
  onEdit,
  onDelete,
}: AnnouncementCardProps) {
  const now = new Date();
  const isStarted = !announcement.startsAt || new Date(announcement.startsAt) <= now;
  const isExpired = announcement.endsAt && new Date(announcement.endsAt) < now;
  const isModerated = announcement.status === "moderated";

  let statusBadge: { label: string; variant: "default" | "secondary" | "destructive" | "outline" } =
    {
      label: "Active",
      variant: "default",
    };

  if (isModerated) {
    statusBadge = { label: "Moderated", variant: "destructive" };
  } else if (isExpired) {
    statusBadge = { label: "Expired", variant: "secondary" };
  } else if (!isStarted) {
    statusBadge = { label: "Scheduled", variant: "outline" };
  }

  const timeAgo = formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true });

  return (
    <article className="bg-card text-card-foreground flex flex-col gap-3 rounded-lg border p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/announcements/$id"
              params={{ id: announcement.id }}
              className="text-foreground hover:text-primary font-semibold transition-colors"
            >
              {announcement.title}
            </Link>
            {isOwner && (
              <Badge variant={statusBadge.variant} className="text-xs">
                {statusBadge.label}
              </Badge>
            )}
          </div>
          {announcement.business && (
            <span className="text-muted-foreground text-xs font-medium">
              {announcement.business.name}
            </span>
          )}
        </div>

        {isOwner && (onEdit || onDelete) ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Announcement options"
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem
                  onClick={() => {
                    onEdit(announcement);
                  }}
                >
                  <Pencil className="mr-2 size-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    onDelete(announcement);
                  }}
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {announcement.imageUrl && (
        <div className="overflow-hidden rounded-md border">
          <img
            src={announcement.imageUrl}
            alt={announcement.title}
            className="max-h-60 w-full object-cover"
          />
        </div>
      )}

      <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
        {announcement.content}
      </p>

      {announcement.linkUrl && (
        <div className="pt-1">
          <a
            href={announcement.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
          >
            Learn more / Order online
            <ExternalLink className="size-3" />
          </a>
        </div>
      )}

      <footer className="border-border text-muted-foreground flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs">
        <div className="flex items-center gap-1.5">
          <Calendar className="size-3.5" />
          <span>Posted {timeAgo}</span>
        </div>
        {Boolean(announcement.startsAt ?? announcement.endsAt) && (
          <div className="flex items-center gap-1">
            <span>
              Visibility:{" "}
              {announcement.startsAt ? new Date(announcement.startsAt).toLocaleDateString() : "Now"}{" "}
              –{" "}
              {announcement.endsAt
                ? new Date(announcement.endsAt).toLocaleDateString()
                : "Indefinite"}
            </span>
          </div>
        )}
      </footer>
    </article>
  );
}
