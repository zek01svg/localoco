import type { ForumPostItem } from "#shared/contracts/forum";

import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "#client/components/ui/button";
import { Skeleton } from "#client/components/ui/skeleton";
import { useSession } from "#client/features/auth";
import { EmptyState } from "#client/features/empty/empty-state";

import { ForumModerationDialog } from "./components/forum-moderation-dialog";
import { ForumPostCard } from "./components/forum-post-card";
import { ForumPostDialog } from "./components/forum-post-dialog";
import {
  useCreateForumPostMutation,
  useDeleteForumPostMutation,
  useForumFeedQuery,
  useModerateForumPostMutation,
  useUpdateForumPostMutation,
} from "./hooks/use-forum";

export function ForumFeedPage() {
  const { user, isAuthenticated, isVerified } = useSession();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [postToEdit, setPostToEdit] = useState<ForumPostItem | null>(null);
  const [postToModerate, setPostToModerate] = useState<ForumPostItem | null>(null);

  const { data, isPending, error, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } =
    useForumFeedQuery();

  const createMutation = useCreateForumPostMutation();
  const updateMutation = useUpdateForumPostMutation(postToEdit?.id ?? "");
  const deleteMutation = useDeleteForumPostMutation();
  const moderateMutation = useModerateForumPostMutation(postToModerate?.id ?? "");

  const isAdmin =
    typeof user === "object" && user !== null && "role" in user && user.role === "admin";

  useEffect(() => {
    document.title = "Community forum — LocaLoco";
  }, []);

  const posts = data ? data.pages.flatMap(page => page.items) : [];

  const handleSubmitDialog = async (formData: {
    title: string;
    body: string;
    businessId?: string;
  }) => {
    try {
      if (postToEdit) {
        await updateMutation.mutateAsync({ title: formData.title, body: formData.body });
        toast.success("Post updated");
      } else {
        await createMutation.mutateAsync({
          businessId: formData.businessId ?? "",
          title: formData.title,
          body: formData.body,
        });
        toast.success("Discussion started!");
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save post");
    }
  };

  const handleDelete = async (post: ForumPostItem) => {
    try {
      await deleteMutation.mutateAsync(post.id);
      toast.success("Post deleted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete post");
    }
  };

  const handleModerate = async (reason: string) => {
    try {
      await moderateMutation.mutateAsync({ reason });
      toast.success("Post moderated");
      setPostToModerate(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to moderate post");
    }
  };

  return (
    <main className="pb-16">
      <link rel="canonical" href={`${window.location.origin}/forum`} />

      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
        <header className="flex flex-col justify-between gap-4 border-b pb-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-display text-2xl tracking-tight sm:text-3xl">Community forum</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Questions and discussions about local businesses, grounded in a Business.
            </p>
          </div>

          {isAuthenticated ? (
            isVerified ? (
              <Button
                size="sm"
                onClick={() => {
                  setPostToEdit(null);
                  setDialogOpen(true);
                }}
              >
                New post
              </Button>
            ) : (
              <p className="text-muted-foreground text-xs">
                Verify your email to start a discussion
              </p>
            )
          ) : (
            <p className="text-muted-foreground text-xs">
              <Link to="/login" className="text-foreground underline">
                Sign in
              </Link>{" "}
              to start a discussion
            </p>
          )}
        </header>

        {isPending ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        ) : error ? (
          <div className="bg-muted/50 flex flex-col items-center gap-3 rounded-lg border p-8 text-center">
            <p className="text-foreground text-sm font-medium">Could not load discussions</p>
            <p className="text-muted-foreground text-xs">
              Something went wrong while reaching the forum. Please try again.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void refetch();
              }}
            >
              Try again
            </Button>
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            title="No discussions yet"
            description="Be the first to start a discussion about a local business."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {posts.map(post => (
              <ForumPostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                isAdmin={isAdmin}
                onEdit={p => {
                  setPostToEdit(p);
                  setDialogOpen(true);
                }}
                onDelete={p => {
                  void handleDelete(p);
                }}
                onModerate={p => {
                  setPostToModerate(p);
                }}
              />
            ))}

            {hasNextPage ? (
              <div className="mt-2 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void fetchNextPage();
                  }}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? "Loading more…" : "Load more discussions"}
                </Button>
              </div>
            ) : null}
          </div>
        )}

        <ForumPostDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          postToEdit={postToEdit}
          onSubmit={handleSubmitDialog}
          isPending={createMutation.isPending || updateMutation.isPending}
        />

        <ForumModerationDialog
          open={Boolean(postToModerate)}
          onOpenChange={open => {
            if (!open) setPostToModerate(null);
          }}
          title="Moderate Forum Post"
          description="Provide a reason for moderating this forum post. It will be hidden from public view."
          onSubmit={handleModerate}
          isPending={moderateMutation.isPending}
        />
      </div>
    </main>
  );
}
