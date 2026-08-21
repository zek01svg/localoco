import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { useEffect } from "react";

import { Badge } from "#client/components/ui/badge";
import { Button } from "#client/components/ui/button";
import { Card, CardContent } from "#client/components/ui/card";
import { ListingAnnouncementsSection } from "#client/features/announcements";
import { BookmarkButton } from "#client/features/bookmarks";
import { ListingEventsSection } from "#client/features/events";
import { NotFoundPage } from "#client/features/not-found/not-found";
import { isOpenAt } from "#shared/contracts/business-hours";

import { ListingContactInfo } from "./components/listing-contact-info";
import { ListingDetailSkeleton } from "./components/listing-detail-skeleton";
import { ListingHoursSchedule } from "./components/listing-hours-schedule";
import { ListingMapView } from "./components/listing-map-view";
import { ListingPhotoGallery } from "./components/listing-photo-gallery";
import { ListingStructuredData } from "./components/listing-structured-data";
import { ListingNotFoundError, useListingDetailQuery } from "./hooks/use-listing-detail";

interface ListingDetailPageProps {
  listingId: string;
}

export function ListingDetailPage({ listingId }: ListingDetailPageProps) {
  const listingQuery = useListingDetailQuery(listingId);
  const listing = listingQuery.data;

  useEffect(() => {
    if (listing) {
      document.title = `${listing.name} — LocaLoco`;
    } else {
      document.title = "Local business — LocaLoco";
    }
  }, [listing]);

  if (listingQuery.isPending) {
    return <ListingDetailSkeleton />;
  }

  if (listingQuery.error instanceof ListingNotFoundError) {
    return <NotFoundPage />;
  }

  if (listingQuery.isError) {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center p-6">
        <div className="border-border w-full max-w-md rounded-xl border p-8 text-center">
          <h1 className="text-xl font-bold">Could not load listing</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {listingQuery.error.message ||
              "An unexpected error occurred while loading this listing."}
          </p>
          <Button
            className="mt-6"
            onClick={() => {
              void listingQuery.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      </main>
    );
  }

  if (!listing) {
    return <NotFoundPage />;
  }

  const isCurrentlyOpen = listing.hours.length > 0 && isOpenAt(listing.hours);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const primaryPhoto = listing.photos[0]?.url;
  const primaryPhotoUrl = primaryPhoto
    ? primaryPhoto.startsWith("http")
      ? primaryPhoto
      : `${origin}${primaryPhoto}`
    : undefined;
  const canonicalUrl = `${origin}/listings/${listing.id}`;
  const metaDescription =
    listing.description ??
    `Discover ${listing.name}, a local ${listing.category} located at ${listing.address}, Singapore ${listing.postalCode}.`;

  return (
    <main className="bg-background min-h-screen pb-16">
      {/* Social and SEO Metadata */}
      <title>{`${listing.name} — LocaLoco`}</title>
      <meta name="description" content={metaDescription} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:title" content={`${listing.name} — LocaLoco`} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="business.business" />
      {primaryPhotoUrl && <meta property="og:image" content={primaryPhotoUrl} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={`${listing.name} — LocaLoco`} />
      <meta name="twitter:description" content={metaDescription} />
      {primaryPhotoUrl && <meta name="twitter:image" content={primaryPhotoUrl} />}

      {/* Schema.org Structured Data */}
      <ListingStructuredData listing={listing} />

      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {/* Navigation Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <Link
            to="/listings"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeftIcon aria-hidden="true" className="size-4" />
            Back to discovery directory
          </Link>
        </nav>

        {/* Hero Header Section */}
        <header className="border-border flex flex-col gap-4 border-b pb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                {listing.name}
              </h1>
              <Badge variant="secondary" className="text-xs sm:text-sm">
                {listing.category}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <BookmarkButton businessId={listing.businessId} size="sm" />
              <Badge variant="outline" className="font-mono text-xs">
                UEN: {listing.uen}
              </Badge>
              {listing.hours.length > 0 && (
                <Badge
                  variant={isCurrentlyOpen ? "default" : "secondary"}
                  className={
                    isCurrentlyOpen
                      ? "bg-emerald-800 text-white hover:bg-emerald-900 dark:bg-emerald-800"
                      : "text-muted-foreground"
                  }
                >
                  {isCurrentlyOpen ? "Open now" : "Closed"}
                </Badge>
              )}
            </div>
          </div>
        </header>

        {/* Main Content & Sidebar Grid */}
        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Main Column */}
          <div className="flex flex-col gap-8 lg:col-span-7">
            {/* Photo Gallery */}
            <ListingPhotoGallery photos={listing.photos} listingName={listing.name} />

            {/* Announcements Section */}
            <ListingAnnouncementsSection businessId={listing.businessId} />

            {/* Events Section */}
            <ListingEventsSection businessId={listing.businessId} />

            {/* Description Section (Deliberately omitted when empty) */}
            {listing.description && (
              <section aria-labelledby="about-heading" className="flex flex-col gap-3">
                <h2 id="about-heading" className="text-xl font-semibold">
                  About
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line sm:text-base">
                  {listing.description}
                </p>
              </section>
            )}

            {/* Location Map View */}
            <ListingMapView
              name={listing.name}
              address={listing.address}
              latitude={listing.latitude}
              longitude={listing.longitude}
            />
          </div>

          {/* Sidebar Column */}
          <aside className="flex flex-col gap-6 lg:col-span-5">
            {/* Opening Hours Card */}
            <Card>
              <CardContent className="p-6">
                <ListingHoursSchedule hours={listing.hours} />
              </CardContent>
            </Card>

            {/* Contact, Payment & Price Card */}
            <Card>
              <CardContent className="p-6">
                <ListingContactInfo listing={listing} />
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}
