import type { OwnerListing } from "#shared/contracts/listings";
import type { ListingFormValues } from "./components/listing-form-fields";

import { useForm } from "@tanstack/react-form";
import { useEffect } from "react";

import { Button } from "#client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#client/components/ui/card";
import { BusinessAnnouncementsSection } from "#client/features/announcements";
import { useSession } from "#client/features/auth";
import { NotFoundPage } from "#client/features/not-found/not-found";
import { BusinessReviewsSection } from "#client/features/reviews";

import {
  HoursSection,
  hoursError,
  hoursRowsFromEntries,
  LISTING_FIELD_DEFS,
  ListingField,
  PaymentOptionsField,
  listingPayload,
} from "./components/listing-form-fields";
import { ListingPhotosSection } from "./components/listing-photos";
import { BusinessesPageGates, PageSkeleton } from "./components/page-gates";
import {
  ListingNotFoundError,
  useOwnedListingQuery,
  useSubmitListingMutation,
  useUpdateListingMutation,
} from "./hooks/business-queries";

function listingToFormValues(listing: OwnerListing): ListingFormValues {
  return {
    name: listing.name,
    category: listing.category,
    address: listing.address,
    postalCode: listing.postalCode,
    phone: listing.phone ?? "",
    email: listing.email ?? "",
    website: listing.website ?? "",
    priceRange: listing.priceRange ?? "",
    paymentOptions: listing.paymentOptions ?? [],
    hours: hoursRowsFromEntries(listing.hours),
  };
}

export function BusinessListingPage({ businessId }: { businessId: string }) {
  useEffect(() => {
    document.title = "Business listing — LocaLoco";
  }, []);

  const { isAuthenticated, isVerified } = useSession();
  const listingQuery = useOwnedListingQuery(businessId, isAuthenticated && isVerified);

  return (
    <BusinessesPageGates>
      {listingQuery.isPending ? <PageSkeleton /> : null}
      {listingQuery.error instanceof ListingNotFoundError ? <NotFoundPage /> : null}
      {listingQuery.error && !(listingQuery.error instanceof ListingNotFoundError) ? (
        <main className="bg-background flex min-h-screen items-start justify-center p-6">
          <Card className="mt-16 w-full max-w-xl">
            <CardHeader>
              <CardTitle>Could not load your listing</CardTitle>
              <CardDescription>{listingQuery.error.message}</CardDescription>
            </CardHeader>
          </Card>
        </main>
      ) : null}
      {listingQuery.data ? (
        <ListingEditForm businessId={businessId} listing={listingQuery.data} />
      ) : null}
    </BusinessesPageGates>
  );
}

function ReviewActionBanner({
  title,
  description,
  variant,
  errorMessage,
  isPending,
  onSubmit,
}: {
  title: string;
  description: string;
  variant: "draft" | "rejected";
  errorMessage?: string;
  isPending: boolean;
  onSubmit: () => void;
}) {
  const isDraft = variant === "draft";
  return (
    <div
      className={
        isDraft
          ? "bg-muted/50 flex flex-col justify-between gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"
          : "bg-destructive/10 border-destructive/20 flex flex-col justify-between gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"
      }
    >
      <div>
        <p className={isDraft ? "text-sm font-medium" : "text-destructive text-sm font-medium"}>
          {title}
        </p>
        <p className={isDraft ? "text-muted-foreground text-sm" : "text-destructive/90 text-sm"}>
          {description}
        </p>
        {errorMessage ? <p className="text-destructive mt-1 text-sm">{errorMessage}</p> : null}
      </div>
      <Button type="button" size="sm" disabled={isPending} onClick={onSubmit}>
        {isPending ? "Submitting…" : "Submit for review"}
      </Button>
    </div>
  );
}

function ListingStatusBanner({
  businessId,
  listing,
}: {
  businessId: string;
  listing: OwnerListing;
}) {
  const submitMutation = useSubmitListingMutation(businessId);

  switch (listing.status) {
    case "draft":
      return (
        <ReviewActionBanner
          title="Draft"
          description="Your listing is private. Submit it for review when you are ready to publish."
          variant="draft"
          errorMessage={submitMutation.error?.message}
          isPending={submitMutation.isPending}
          onSubmit={() => {
            submitMutation.mutate();
          }}
        />
      );

    case "pending_review":
      return (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Pending Review</p>
          <p className="text-sm text-amber-800/80 dark:text-amber-300/80">
            An administrator is currently reviewing your listing.
          </p>
        </div>
      );

    case "published":
      return (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">Published</p>
          <p className="text-sm text-emerald-800/80 dark:text-emerald-300/80">
            Your listing is live in public discovery. Saving changes will return it to review.
          </p>
        </div>
      );

    case "rejected":
      return (
        <ReviewActionBanner
          title="Changes Required"
          description={`${listing.rejectionReason ? `Reason: ${listing.rejectionReason}` : "Your listing was rejected."} Update your details below and submit for review again.`}
          variant="rejected"
          errorMessage={submitMutation.error?.message}
          isPending={submitMutation.isPending}
          onSubmit={() => {
            submitMutation.mutate();
          }}
        />
      );

    case "suspended":
      return (
        <div className="bg-destructive/10 border-destructive/20 rounded-lg border p-4">
          <p className="text-destructive text-sm font-medium">Suspended</p>
          <p className="text-destructive/90 text-sm">
            {listing.rejectionReason
              ? `Reason: ${listing.rejectionReason}`
              : "This listing has been suspended by an administrator."}
          </p>
        </div>
      );
  }
  return null;
}

function ListingEditForm({ businessId, listing }: { businessId: string; listing: OwnerListing }) {
  const { user } = useSession();
  const updateListingMutation = useUpdateListingMutation(businessId);
  const pendingMutation = updateListingMutation.isPending;

  const form = useForm({
    defaultValues: listingToFormValues(listing),
    onSubmit: ({ value }) => {
      if (hoursError(value.hours) !== undefined) {
        return;
      }
      updateListingMutation.mutate(listingPayload(value));
    },
  });

  return (
    <main className="bg-background flex min-h-screen items-start justify-center p-6">
      <div className="mt-16 flex w-full max-w-xl flex-col gap-6">
        <ListingStatusBanner businessId={businessId} listing={listing} />
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Your business listing</CardTitle>
            <CardDescription>
              Manage your business details and opening hours. Saving changes to a published listing
              returns it to review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={e => {
                e.preventDefault();
                e.stopPropagation();
                void form.handleSubmit();
              }}
            >
              {LISTING_FIELD_DEFS.map(def => (
                <form.Field
                  key={def.name}
                  name={def.name}
                  validators={
                    def.required
                      ? {
                          onChange: ({ value }) =>
                            value.trim().length === 0 ? "Required" : undefined,
                        }
                      : undefined
                  }
                >
                  {field => (
                    <ListingField
                      id={def.name}
                      label={def.label}
                      type={def.type}
                      placeholder={def.placeholder}
                      optional={def.optional}
                      maxLength={def.maxLength}
                      disabled={pendingMutation}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={field.handleChange}
                    />
                  )}
                </form.Field>
              ))}

              <form.Field name="hours">
                {field => (
                  <HoursSection
                    value={field.state.value}
                    onChange={field.handleChange}
                    disabled={pendingMutation}
                  />
                )}
              </form.Field>

              <form.Field name="paymentOptions">
                {field => (
                  <PaymentOptionsField
                    value={field.state.value}
                    onChange={field.handleChange}
                    disabled={pendingMutation}
                  />
                )}
              </form.Field>

              {updateListingMutation.error ? (
                <p className="text-destructive text-sm">{updateListingMutation.error.message}</p>
              ) : null}

              <div className="flex items-center justify-between gap-4">
                {updateListingMutation.isSuccess ? (
                  <p className="text-muted-foreground text-sm">Changes saved.</p>
                ) : (
                  <span />
                )}
                <Button type="submit" disabled={pendingMutation}>
                  {pendingMutation ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <ListingPhotosSection businessId={businessId} />
        <BusinessAnnouncementsSection businessId={businessId} listingStatus={listing.status} />
        <Card>
          <CardContent className="pt-6">
            <BusinessReviewsSection businessId={businessId} ownerId={user?.id} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
