import { Skeleton } from "#client/components/ui/skeleton";

export function ListingDetailSkeleton() {
  return (
    <main aria-label="Loading listing details" className="bg-background min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        {/* Hero Header Skeleton */}
        <div className="flex flex-col gap-4 border-b pb-8">
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-8 w-64 sm:h-10 sm:w-96" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-48" />
          </div>
        </div>

        {/* Photos and Info Grid Skeleton */}
        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Main Column */}
          <div className="flex flex-col gap-8 lg:col-span-7">
            <Skeleton className="aspect-video w-full rounded-xl" />
            <div className="flex flex-col gap-3">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>

          {/* Sidebar Column */}
          <div className="flex flex-col gap-8 lg:col-span-5">
            <div className="flex flex-col gap-3 rounded-xl border p-6">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="flex flex-col gap-3 rounded-xl border p-6">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-40 w-full" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
