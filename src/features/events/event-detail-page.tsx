import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon, Calendar, Clock, ExternalLink } from "lucide-react";
import { useEffect } from "react";

import { Badge } from "#client/components/ui/badge";
import { Button } from "#client/components/ui/button";
import { NotFoundPage } from "#client/features/not-found/not-found";

import { EventNotFoundError, useEventDetailQuery } from "./hooks/use-events";

interface EventDetailPageProps {
  eventId: string;
}

function formatDateRange(start: Date, end: Date) {
  const startStr = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const endStr = end.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${startStr} – ${endStr}`;
}

export function EventDetailPage({ eventId }: EventDetailPageProps) {
  const query = useEventDetailQuery(eventId);
  const event = query.data;

  useEffect(() => {
    if (event) {
      document.title = `${event.title} — LocaLoco`;
    } else {
      document.title = "Event — LocaLoco";
    }
  }, [event]);

  if (query.isPending) {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center p-6">
        <p className="text-muted-foreground text-sm">Loading event...</p>
      </main>
    );
  }

  if (query.error instanceof EventNotFoundError) {
    return <NotFoundPage />;
  }

  if (query.isError) {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center p-6">
        <div className="border-border w-full max-w-md rounded-xl border p-8 text-center">
          <h1 className="text-xl font-bold">Could not load event</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {query.error.message || "An unexpected error occurred."}
          </p>
          <Button className="mt-6" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </div>
      </main>
    );
  }

  if (!event) {
    return <NotFoundPage />;
  }

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const canonicalUrl = `${origin}/events/${event.id}`;
  const metaDescription = event.description.slice(0, 160);

  const startsAtDate = new Date(event.startsAt);
  const endsAtDate = new Date(event.endsAt);

  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    startDate: startsAtDate.toISOString(),
    endDate: endsAtDate.toISOString(),
    eventStatus:
      event.status === "active"
        ? "https://schema.org/EventScheduled"
        : "https://schema.org/EventCancelled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    ...(event.imageUrl ? { image: [event.imageUrl] } : {}),
    ...(event.business
      ? {
          organizer: {
            "@type": "Organization",
            name: event.business.name,
            url: `${origin}/listings/${event.businessId}`,
          },
        }
      : {}),
  };

  return (
    <main className="bg-background min-h-screen pb-16">
      {/* Social and SEO Metadata */}
      <title>{`${event.title} — LocaLoco`}</title>
      <meta name="description" content={metaDescription} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:title" content={`${event.title} — LocaLoco`} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="article" />
      {event.imageUrl && <meta property="og:image" content={event.imageUrl} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={`${event.title} — LocaLoco`} />
      <meta name="twitter:description" content={metaDescription} />
      {event.imageUrl && <meta name="twitter:image" content={event.imageUrl} />}

      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(eventJsonLd).replaceAll("<", "\\u003c"),
        }}
      />

      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <nav aria-label="Breadcrumb" className="mb-6">
          <Link
            to="/listings/$id"
            params={{ id: event.businessId }}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeftIcon aria-hidden="true" className="size-4" />
            Back to {event.business?.name ?? "business listing"}
          </Link>
        </nav>

        <article className="flex flex-col gap-6">
          <header className="border-border flex flex-col gap-3 border-b pb-6">
            <div className="flex flex-wrap items-center gap-2">
              {event.business?.category && (
                <Badge variant="secondary" className="text-xs">
                  {event.business.category}
                </Badge>
              )}
              {event.status === "active" && (
                <Badge variant="default" className="text-xs">
                  Active Event
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              {event.title}
            </h1>
            <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-xs sm:text-sm">
              {event.business && (
                <span>
                  Organized by{" "}
                  <Link
                    to="/listings/$id"
                    params={{ id: event.businessId }}
                    className="text-foreground font-semibold hover:underline"
                  >
                    {event.business.name}
                  </Link>
                </span>
              )}
              <div className="flex items-center gap-1.5 font-medium">
                <Clock className="text-primary size-4" />
                <span>{formatDateRange(startsAtDate, endsAtDate)}</span>
              </div>
            </div>
          </header>

          {event.imageUrl && (
            <div className="overflow-hidden rounded-xl border">
              <img
                src={event.imageUrl}
                alt={event.title}
                className="max-h-96 w-full object-cover"
              />
            </div>
          )}

          <div className="text-foreground text-base leading-relaxed whitespace-pre-line sm:text-lg">
            {event.description}
          </div>

          {event.linkUrl && (
            <div className="pt-2">
              <Button asChild>
                <a
                  href={event.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  RSVP / View Event Link
                  <ExternalLink className="size-4" />
                </a>
              </Button>
            </div>
          )}

          <footer className="border-border text-muted-foreground flex items-center gap-1.5 border-t pt-4 text-xs">
            <Calendar className="size-3.5" />
            <span>Posted on {new Date(event.createdAt).toLocaleDateString()}</span>
          </footer>
        </article>
      </div>
    </main>
  );
}
