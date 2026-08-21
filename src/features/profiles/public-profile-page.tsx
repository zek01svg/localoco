import { useEffect } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "#client/components/ui/avatar";
import { Skeleton } from "#client/components/ui/skeleton";
import { NotFoundPage } from "#client/features/not-found/not-found";
import { UserReviewsList } from "#client/features/reviews";

import { ProfileNotFoundError, usePublicProfileQuery } from "./hooks/use-public-profile-query";
import { initialsOf } from "./initials";

export function PublicProfilePage({ userId }: { userId: string }) {
  const { data, isPending, error } = usePublicProfileQuery(userId);

  useEffect(() => {
    if (data) {
      document.title = `${data.displayName} — LocaLoco`;
    }
  }, [data]);

  if (isPending) {
    return (
      <main className="flex items-start justify-center p-6">
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
      <main className="flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground">{error.message}</p>
      </main>
    );
  }

  return (
    <main className="flex items-start justify-center p-6">
      <div className="flex w-full max-w-2xl flex-col items-center gap-6 pt-16">
        <section className="flex flex-col items-center gap-4 text-center">
          <Avatar size="lg">
            {data.avatarUrl ? <AvatarImage src={data.avatarUrl} alt={data.displayName} /> : null}
            <AvatarFallback>{initialsOf(data.displayName)}</AvatarFallback>
          </Avatar>
          <h1 className="font-display text-2xl tracking-tight">{data.displayName}</h1>
        </section>

        <UserReviewsList userId={userId} userName={data.displayName} />
      </div>
    </main>
  );
}
