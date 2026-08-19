import type { EventItem } from "#shared/contracts/events";

import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { Calendar, Clock, ExternalLink, MoreVertical, Pencil, Trash2 } from "lucide-react";

import { Badge } from "#client/components/ui/badge";
import { Button } from "#client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#client/components/ui/dropdown-menu";

interface EventCardProps {
  event: EventItem;
  isOwner?: boolean;
  onEdit?: (event: EventItem) => void;
  onDelete?: (event: EventItem) => void;
}

function formatDateRange(start: Date, end: Date) {
  const startStr = start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const endStr = end.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${startStr} – ${endStr}`;
}

export function EventCard({ event, isOwner, onEdit, onDelete }: EventCardProps) {
  const now = new Date();
  const startsAtDate = new Date(event.startsAt);
  const endsAtDate = new Date(event.endsAt);
  const isStarted = startsAtDate <= now;
  const isExpired = endsAtDate < now;
  const isModerated = event.status === "moderated";

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
    statusBadge = { label: "Upcoming", variant: "outline" };
  }

  const timeAgo = formatDistanceToNow(new Date(event.createdAt), { addSuffix: true });

  return (
    <article className="bg-card text-card-foreground flex flex-col gap-3 rounded-lg border p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/events/$id"
              params={{ id: event.id }}
              className="text-foreground hover:text-primary font-semibold transition-colors"
            >
              {event.title}
            </Link>
            {isOwner && (
              <Badge variant={statusBadge.variant} className="text-xs">
                {statusBadge.label}
              </Badge>
            )}
          </div>
          {event.business && (
            <span className="text-muted-foreground text-xs font-medium">{event.business.name}</span>
          )}
        </div>

        {isOwner && (onEdit || onDelete) ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" aria-label="Event options">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem
                  onClick={() => {
                    onEdit(event);
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
                    onDelete(event);
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

      <div className="text-primary flex items-center gap-1.5 text-xs font-medium">
        <Clock className="size-3.5" />
        <span>{formatDateRange(startsAtDate, endsAtDate)}</span>
      </div>

      {event.imageUrl && (
        <div className="overflow-hidden rounded-md border">
          <img src={event.imageUrl} alt={event.title} className="max-h-60 w-full object-cover" />
        </div>
      )}

      <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
        {event.description}
      </p>

      {event.linkUrl && (
        <div className="pt-1">
          <a
            href={event.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Event details / RSVP (opens in new tab)"
            className="text-primary inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
          >
            Event details / RSVP
            <ExternalLink className="size-3" />
          </a>
        </div>
      )}

      <footer className="border-border text-muted-foreground flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs">
        <div className="flex items-center gap-1.5">
          <Calendar className="size-3.5" />
          <span>Posted {timeAgo}</span>
        </div>
      </footer>
    </article>
  );
}
