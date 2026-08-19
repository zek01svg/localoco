import type { Listing } from "#shared/contracts/listings";

import { LoaderCircleIcon, MapPinIcon, SearchIcon } from "lucide-react";
import { useQueryState } from "nuqs";
import { useEffect } from "react";

import { Badge } from "#client/components/ui/badge";
import { Button } from "#client/components/ui/button";
import { Card } from "#client/components/ui/card";
import { Input } from "#client/components/ui/input";
import { NativeSelect, NativeSelectOption } from "#client/components/ui/native-select";
import { Skeleton } from "#client/components/ui/skeleton";
import { EmptyState } from "#client/features/empty/empty-state";
import { useDebounce } from "#client/hooks/use-debounce";

import { useListingsCategoriesQuery, useListingsInfiniteQuery } from "./hooks/use-listings";

function ListingCard({ listing }: { listing: Listing }) {
  const contactLine = [listing.phone, listing.priceRange].filter((value): value is string =>
    Boolean(value)
  );

  return (
    <Card>
      <div className="flex flex-col gap-2 p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">{listing.name}</h2>
          <Badge variant="secondary">{listing.category}</Badge>
        </div>
        <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <MapPinIcon aria-hidden="true" className="size-4 shrink-0" />
          {listing.address}
        </p>
        {contactLine.length > 0 && (
          <p className="text-muted-foreground text-sm">{contactLine.join(" · ")}</p>
        )}
      </div>
    </Card>
  );
}

function ListingSkeleton() {
  return (
    <Card>
      <div className="flex flex-col gap-3 p-5">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full max-w-sm" />
      </div>
    </Card>
  );
}

export function DiscoveryPage() {
  const [q, setQ] = useQueryState("q", { defaultValue: "", clearOnDefault: true });
  const [category, setCategory] = useQueryState("category", {
    defaultValue: "",
    clearOnDefault: true,
  });
  const debouncedQ = useDebounce(q, 350);

  const categoriesQuery = useListingsCategoriesQuery();
  const listingsQuery = useListingsInfiniteQuery(debouncedQ, category);

  const hasFilters = Boolean(q || category);
  const items = listingsQuery.data?.pages.flatMap(page => page.items) ?? [];

  useEffect(() => {
    document.title = "Discover local businesses — LocaLoco";
  }, []);

  return (
    <main className="bg-background min-h-screen">
      <meta
        name="description"
        content="Browse Singapore's local businesses by name, category, and neighbourhood."
      />
      <link rel="canonical" href={`${location.origin}/listings`} />

      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Discover local businesses</h1>
          <p className="text-muted-foreground mt-2">
            Search the directory by name, category, or neighbourhood.
          </p>
        </header>

        <search className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="listing-search" className="relative flex-1">
            <span className="sr-only">Search businesses</span>
            <SearchIcon
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
              id="listing-search"
              type="search"
              value={q}
              onChange={event => {
                void setQ(event.target.value);
              }}
              placeholder="Search name, category, or area…"
              className="pl-9"
              autoComplete="off"
            />
          </label>
          <label htmlFor="listing-category" className="sm:w-56">
            <span className="sr-only">Filter by category</span>
            <NativeSelect
              id="listing-category"
              value={category}
              onChange={event => {
                void setCategory(event.target.value);
              }}
              className="w-full"
            >
              <NativeSelectOption value="">All categories</NativeSelectOption>
              {(categoriesQuery.data?.items ?? []).map(name => (
                <NativeSelectOption key={name} value={name}>
                  {name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
        </search>

        <section aria-live="polite" className="mt-8">
          {listingsQuery.isPending ? (
            <ul className="flex flex-col gap-4">
              {Array.from({ length: 4 }, (_, i) => (
                <li key={i}>
                  <ListingSkeleton />
                </li>
              ))}
            </ul>
          ) : listingsQuery.isError ? (
            <div className="border-border rounded-lg border p-10 text-center">
              <h2 className="text-lg font-semibold">Business listings could not be loaded</h2>
              <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
                {listingsQuery.error.message}
              </p>
              <Button
                className="mt-6"
                onClick={() => {
                  void listingsQuery.refetch();
                }}
              >
                Try again
              </Button>
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              title="No businesses matched"
              description={
                hasFilters
                  ? "Try a different search or clear the filters."
                  : "No published businesses yet. Check back soon."
              }
              action={
                hasFilters ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      void setQ("");
                      void setCategory("");
                    }}
                  >
                    Clear filters
                  </Button>
                ) : null
              }
            />
          ) : (
            <>
              <ul className="flex flex-col gap-4">
                {items.map(item => (
                  <li key={item.id}>
                    <ListingCard listing={item} />
                  </li>
                ))}
              </ul>
              {listingsQuery.hasNextPage ? (
                <div className="mt-8 flex justify-center">
                  <Button
                    variant="outline"
                    disabled={listingsQuery.isFetchingNextPage}
                    onClick={() => {
                      void listingsQuery.fetchNextPage();
                    }}
                  >
                    {listingsQuery.isFetchingNextPage ? (
                      <LoaderCircleIcon aria-hidden="true" className="size-4 animate-spin" />
                    ) : null}
                    Load more
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
