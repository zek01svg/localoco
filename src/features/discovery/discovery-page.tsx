import type { Listing } from "#shared/contracts/listings";
import type { MapBounds } from "./hooks/use-listings";

import { Link } from "@tanstack/react-router";
import { clsx } from "clsx";
import { LoaderCircleIcon, MapPinIcon, SearchIcon, XIcon } from "lucide-react";
import { parseAsBoolean, useQueryState } from "nuqs";
import React, { Suspense, useEffect, useState } from "react";

import { Badge } from "#client/components/ui/badge";
import { Button } from "#client/components/ui/button";
import { Card } from "#client/components/ui/card";
import { Input } from "#client/components/ui/input";
import { Label } from "#client/components/ui/label";
import { NativeSelect, NativeSelectOption } from "#client/components/ui/native-select";
import { Skeleton } from "#client/components/ui/skeleton";
import { Switch } from "#client/components/ui/switch";
import { EmptyState } from "#client/features/empty/empty-state";
import { useDebounce } from "#client/hooks/use-debounce";

import { useListingsCategoriesQuery, useListingsInfiniteQuery } from "./hooks/use-listings";

// Maps JavaScript loads lazily so it never gates the textual directory.
const DiscoveryMap = React.lazy(() => import("./components/discovery-map"));

function MapSkeleton() {
  return (
    <section
      aria-label="Loading map"
      className="border-border bg-muted/20 flex h-full min-h-[350px] w-full flex-col items-center justify-center rounded-lg border p-6"
    >
      <Skeleton className="size-10 rounded-full" />
      <Skeleton className="mt-3 h-4 w-28" />
    </section>
  );
}

function ListingCard({
  listing,
  isSelected,
  onSelect,
}: {
  listing: Listing;
  isSelected?: boolean;
  onSelect?: () => void;
}) {
  const contactLine = [listing.phone, listing.priceRange].filter((value): value is string =>
    Boolean(value)
  );

  return (
    <Card
      className={clsx(
        "cursor-pointer transition-colors hover:border-foreground/20",
        isSelected && "ring-primary ring-2"
      )}
      onClick={onSelect}
    >
      <div className="flex flex-col gap-2 p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">
            <Link
              to="/listings/$id"
              params={{ id: listing.id }}
              className="hover:underline focus:underline"
              onClick={e => {
                e.stopPropagation();
              }}
            >
              {listing.name}
            </Link>
          </h2>
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
  const [openNow, setOpenNow] = useQueryState("openNow", parseAsBoolean.withDefault(false));
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const debouncedQ = useDebounce(q, 350);

  const categoriesQuery = useListingsCategoriesQuery();
  const listingsQuery = useListingsInfiniteQuery(debouncedQ, category, openNow, bounds);

  const hasFilters = Boolean(q || category || openNow || bounds);
  const items = listingsQuery.data?.pages.flatMap(page => page.items) ?? [];

  useEffect(() => {
    document.title = "Discover local businesses — LocaLoco";
  }, []);

  const handleClearFilters = () => {
    void setQ("");
    void setCategory("");
    void setOpenNow(false);
    setBounds(null);
    setSelectedId(null);
  };

  return (
    <main className="bg-background min-h-screen">
      <meta
        name="description"
        content="Browse Singapore's local businesses by name, category, and neighbourhood."
      />
      <link rel="canonical" href={`${location.origin}/listings`} />

      <div className="mx-auto w-full max-w-7xl px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Discover local businesses</h1>
          <p className="text-muted-foreground mt-2">
            Search the directory by name, category, or neighbourhood.
          </p>
        </header>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          {/* Textual Directory Column */}
          <div className="flex flex-col gap-6 lg:col-span-7">
            <search className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
              <div className="flex items-center gap-2 px-1 py-1.5 sm:py-0">
                <Switch
                  id="listing-open-now"
                  checked={openNow}
                  onCheckedChange={checked => {
                    void setOpenNow(checked);
                  }}
                />
                <Label
                  htmlFor="listing-open-now"
                  className="cursor-pointer text-sm font-medium whitespace-nowrap"
                >
                  Open now
                </Label>
              </div>
            </search>

            {bounds && (
              <div className="border-border bg-muted/40 flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="text-muted-foreground">Filtering by map area</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => {
                    setBounds(null);
                  }}
                >
                  <XIcon aria-hidden="true" className="size-3.5" />
                  Remove map filter
                </Button>
              </div>
            )}

            <section aria-live="polite">
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
                      <Button variant="outline" onClick={handleClearFilters}>
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
                        <ListingCard
                          listing={item}
                          isSelected={item.id === selectedId}
                          onSelect={() => {
                            setSelectedId(item.id === selectedId ? null : item.id);
                          }}
                        />
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

          {/* Browser Map Column */}
          <aside className="h-[400px] lg:sticky lg:top-8 lg:col-span-5 lg:h-[calc(100vh-8rem)]">
            <Suspense fallback={<MapSkeleton />}>
              <DiscoveryMap
                items={items}
                activeBounds={bounds}
                onBoundsChange={setBounds}
                selectedId={selectedId}
                onSelectListing={setSelectedId}
              />
            </Suspense>
          </aside>
        </div>
      </div>
    </main>
  );
}
