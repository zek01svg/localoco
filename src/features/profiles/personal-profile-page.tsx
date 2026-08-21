import { Link, Navigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "#client/components/ui/avatar";
import { Button } from "#client/components/ui/button";
import { Skeleton } from "#client/components/ui/skeleton";
import { useSession } from "#client/features/auth";
import { useBookmarksQuery, useRemoveBookmarkMutation } from "#client/features/bookmarks";

import { AccountDeletionSection } from "./components/account-deletion-section";
import { EmailChangeForm } from "./components/email-change-form";
import { ProfileDetailsForm } from "./components/profile-details-form";
import { usePersonalProfileQuery } from "./hooks/personal-profile-queries";
import { useOwnedBusinessesQuery } from "./hooks/use-owned-businesses-query";
import { initialsOf } from "./initials";

function ProfileSkeleton() {
  return (
    <main className="flex items-start justify-center p-6">
      <section className="w-full max-w-xl space-y-6 pt-16">
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </section>
    </main>
  );
}

function BookmarksSection() {
  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } = useBookmarksQuery();

  const removeMutation = useRemoveBookmarkMutation();

  if (isPending) {
    return <Skeleton className="h-16 w-full" />;
  }

  const items = data?.pages.flatMap(page => page.items) ?? [];

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        You haven&apos;t bookmarked any businesses yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="divide-border divide-y">
        {items.map(item => (
          <li key={item.id} className="flex items-center justify-between py-3">
            <div className="space-y-0.5">
              <Link
                to="/businesses/$id"
                params={{ id: item.businessId }}
                className="hover:text-primary font-medium hover:underline"
              >
                {item.listing?.name ?? item.business.uen}
              </Link>
              {item.listing?.category && (
                <p className="text-muted-foreground text-xs">
                  {item.listing.category} · {item.listing.address}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive text-xs"
              onClick={() => {
                removeMutation.mutate(item.businessId);
              }}
              disabled={removeMutation.isPending}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
      {hasNextPage && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            void fetchNextPage();
          }}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? "Loading more..." : "Load more bookmarks"}
        </Button>
      )}
    </div>
  );
}

function OwnedBusinessesSection({ isVerified }: { isVerified: boolean }) {
  const { data, isPending } = useOwnedBusinessesQuery(isVerified);

  if (!isVerified) {
    return (
      <p className="text-muted-foreground text-sm">
        Verify your email to manage businesses you own.
      </p>
    );
  }

  if (isPending) {
    return <Skeleton className="h-16 w-full" />;
  }

  if (!data || data.items.length === 0) {
    return <p className="text-muted-foreground text-sm">You do not own any businesses yet.</p>;
  }

  return (
    <ul className="divide-border divide-y">
      {data.items.map(item => (
        <li key={item.id} className="flex items-center justify-between py-2 text-sm">
          <span className="font-medium">{item.uen}</span>
        </li>
      ))}
    </ul>
  );
}

export function PersonalProfilePage() {
  const { isAuthenticated, isVerified, isPending: sessionPending } = useSession();
  const profileQuery = usePersonalProfileQuery(isAuthenticated);

  useEffect(() => {
    if (profileQuery.data) {
      document.title = "My profile — LocaLoco";
    }
  }, [profileQuery.data]);

  if (sessionPending) {
    return <ProfileSkeleton />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (profileQuery.isPending) {
    return <ProfileSkeleton />;
  }

  const profile = profileQuery.data;
  if (!profile) {
    return null;
  }

  return (
    <main className="flex items-start justify-center p-6">
      <section className="w-full max-w-xl space-y-8 pt-16">
        <header className="flex items-center gap-4">
          <Avatar size="lg">
            {profile.avatarUrl ? (
              <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
            ) : null}
            <AvatarFallback>{initialsOf(profile.displayName)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-display flex items-center gap-2 text-2xl tracking-tight">
              {profile.displayName}
              {isVerified ? (
                <span className="bg-success/10 text-success rounded-full px-2 py-0.5 text-xs font-normal">
                  Verified
                </span>
              ) : (
                <span className="bg-warning/10 text-warning rounded-full px-2 py-0.5 text-xs font-normal">
                  Unverified
                </span>
              )}
            </h1>
            <p className="text-muted-foreground text-sm">{profile.email}</p>
          </div>
        </header>

        <section
          aria-labelledby="profile-details-heading"
          className="border-border rounded-lg border p-6"
        >
          <h2 id="profile-details-heading" className="font-display mb-4 text-lg tracking-tight">
            Profile details
          </h2>
          <ProfileDetailsForm displayName={profile.displayName} avatarUrl={profile.avatarUrl} />
        </section>

        <section aria-labelledby="email-heading" className="border-border rounded-lg border p-6">
          <h2 id="email-heading" className="font-display mb-4 text-lg tracking-tight">
            Email address
          </h2>
          <EmailChangeForm />
        </section>

        <section
          aria-labelledby="bookmarks-heading"
          className="border-border rounded-lg border p-6"
        >
          <h2 id="bookmarks-heading" className="font-display mb-4 text-lg tracking-tight">
            Saved bookmarks
          </h2>
          <BookmarksSection />
        </section>

        <section
          aria-labelledby="businesses-heading"
          className="border-border rounded-lg border p-6"
        >
          <h2 id="businesses-heading" className="font-display mb-4 text-lg tracking-tight">
            Owned businesses
          </h2>
          <OwnedBusinessesSection isVerified={isVerified} />
        </section>

        <AccountDeletionSection />
      </section>
    </main>
  );
}
