import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon, Calendar, ExternalLink } from "lucide-react";
import { useEffect } from "react";

import { Badge } from "#client/components/ui/badge";
import { Button } from "#client/components/ui/button";
import { NotFoundPage } from "#client/features/not-found/not-found";

import { AnnouncementNotFoundError, useAnnouncementDetailQuery } from "./hooks/use-announcements";

interface AnnouncementDetailPageProps {
  announcementId: string;
}

export function AnnouncementDetailPage({ announcementId }: AnnouncementDetailPageProps) {
  const query = useAnnouncementDetailQuery(announcementId);
  const announcement = query.data;

  useEffect(() => {
    if (announcement) {
      document.title = `${announcement.title} — LocaLoco`;
    } else {
      document.title = "Announcement — LocaLoco";
    }
  }, [announcement]);

  if (query.isPending) {
    return (
      <main className="flex items-center justify-center p-6">
        <p className="text-muted-foreground text-sm">Loading announcement...</p>
      </main>
    );
  }

  if (query.error instanceof AnnouncementNotFoundError) {
    return <NotFoundPage />;
  }

  if (query.isError) {
    return (
      <main className="flex items-center justify-center p-6">
        <div className="border-border w-full max-w-md rounded-lg border p-8 text-center">
          <h1 className="font-display text-xl tracking-tight">Could not load announcement</h1>
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

  if (!announcement) {
    return <NotFoundPage />;
  }

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const canonicalUrl = `${origin}/announcements/${announcement.id}`;
  const metaDescription = announcement.content.slice(0, 160);

  return (
    <main className="pb-16">
      {/* Social and SEO Metadata */}
      <title>{`${announcement.title} — LocaLoco`}</title>
      <meta name="description" content={metaDescription} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:title" content={`${announcement.title} — LocaLoco`} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="article" />
      {announcement.imageUrl && <meta property="og:image" content={announcement.imageUrl} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={`${announcement.title} — LocaLoco`} />
      <meta name="twitter:description" content={metaDescription} />
      {announcement.imageUrl && <meta name="twitter:image" content={announcement.imageUrl} />}

      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <nav aria-label="Breadcrumb" className="mb-6">
          <Link
            to="/listings/$id"
            params={{ id: announcement.businessId }}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeftIcon aria-hidden="true" className="size-4" />
            Back to {announcement.business?.name ?? "business listing"}
          </Link>
        </nav>

        <article className="flex flex-col gap-6">
          <header className="border-border flex flex-col gap-3 border-b pb-6">
            <div className="flex flex-wrap items-center gap-2">
              {announcement.business?.category && (
                <Badge variant="secondary" className="text-xs">
                  {announcement.business.category}
                </Badge>
              )}
              {announcement.status === "active" && (
                <Badge variant="default" className="text-xs">
                  Active Update
                </Badge>
              )}
            </div>
            <h1 className="font-display text-2xl tracking-tight sm:text-3xl lg:text-4xl">
              {announcement.title}
            </h1>
            <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-xs sm:text-sm">
              {announcement.business && (
                <span>
                  By{" "}
                  <Link
                    to="/listings/$id"
                    params={{ id: announcement.businessId }}
                    className="text-foreground font-semibold hover:underline"
                  >
                    {announcement.business.name}
                  </Link>
                </span>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                <span>Posted on {new Date(announcement.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </header>

          {announcement.imageUrl && (
            <div className="overflow-hidden rounded-lg border">
              <img
                src={announcement.imageUrl}
                alt={announcement.title}
                className="max-h-96 w-full object-cover"
              />
            </div>
          )}

          <div className="text-foreground text-base leading-relaxed whitespace-pre-line sm:text-lg">
            {announcement.content}
          </div>

          {announcement.linkUrl && (
            <div className="pt-2">
              <a
                href={announcement.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                <Button>
                  Visit link / Action
                  <ExternalLink className="size-4" />
                </Button>
              </a>
            </div>
          )}
        </article>
      </div>
    </main>
  );
}
