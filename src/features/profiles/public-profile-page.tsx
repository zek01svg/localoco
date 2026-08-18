import { useEffect } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "#client/components/ui/avatar";
import { Skeleton } from "#client/components/ui/skeleton";
import { NotFoundPage } from "#client/features/not-found/not-found";

import { ProfileNotFoundError, usePublicProfileQuery } from "./hooks/use-public-profile-query";

function initialsOf(displayName: string): string {
  return displayName
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join("");
}

export function PublicProfilePage({ userId }: { userId: string }) {
  const { data, isPending, error } = usePublicProfileQuery(userId);

  useEffect(() => {
    if (data) {
      document.title = `${data.displayName} — LocaLoco`;
    }
  }, [data]);

  if (isPending) {
    return (
      <main className="bg-background flex min-h-screen items-start justify-center p-6">
        <section className="flex flex-col items-center gap-4 pt-16 text-center">
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="h-8 w-40" />
        </section>
      </main>
    );
  }

  if (error) {
    if (error instanceof ProfileNotFoundError) {
      return <NotFoundPage />;
    }
    return (
      <main className="bg-background flex min-h-screen flex-col items-center justify-center p-6">
        <p className="text-muted-foreground">{error.message}</p>
      </main>
    );
  }

  return (
    <main className="bg-background flex min-h-screen items-start justify-center p-6">
      <section className="flex flex-col items-center gap-4 pt-16 text-center">
        <Avatar size="lg">
          {data.avatarUrl ? <AvatarImage src={data.avatarUrl} alt={data.displayName} /> : null}
          <AvatarFallback>{initialsOf(data.displayName)}</AvatarFallback>
        </Avatar>
        <h1 className="text-2xl font-semibold tracking-tight">{data.displayName}</h1>
      </section>
    </main>
  );
}
