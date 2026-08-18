import type { OwnerListing } from "#shared/contracts/listings";
import type { ListingFieldName, ListingFormValues } from "./components/listing-form-fields";
import type { FieldApi } from "@tanstack/react-form";

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
import { useSession } from "#client/features/auth";
import { NotFoundPage } from "#client/features/not-found/not-found";

import {
  LISTING_FIELD_DEFS,
  ListingField,
  PaymentOptionsField,
  listingPayload,
} from "./components/listing-form-fields";
import { BusinessesPageGates, PageSkeleton } from "./components/page-gates";
import {
  ListingNotFoundError,
  useOwnedListingQuery,
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

function ListingEditForm({ businessId, listing }: { businessId: string; listing: OwnerListing }) {
  const updateListingMutation = useUpdateListingMutation(businessId);
  const pendingMutation = updateListingMutation.isPending;

  const form = useForm({
    defaultValues: listingToFormValues(listing),
    onSubmit: ({ value }) => {
      updateListingMutation.mutate(listingPayload(value));
    },
  });

  return (
    <main className="bg-background flex min-h-screen items-start justify-center p-6">
      <Card className="mt-16 w-full max-w-xl">
        <CardHeader>
          <CardTitle>Your business listing</CardTitle>
          <CardDescription>
            Changes are published immediately. The listing shows on your public business page.
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
                {(field: FieldApi<ListingFormValues, ListingFieldName>) => (
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
    </main>
  );
}
