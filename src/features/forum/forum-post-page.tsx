import type { ForumReplyItem } from "#shared/contracts/forum";

import { Link, useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeftIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { LikeButton } from "#client/components/like-button";
import { Avatar, AvatarFallback, AvatarImage } from "#client/components/ui/avatar";
import { Badge } from "#client/components/ui/badge";
import { Button } from "#client/components/ui/button";
import { Skeleton } from "#client/components/ui/skeleton";
import { Textarea } from "#client/components/ui/textarea";
import { useSession } from "#client/features/auth";
import {
  useToggleForumPostLikeMutation,
  useToggleForumReplyLikeMutation,
} from "#client/features/likes";
import { NotFoundPage } from "#client/features/not-found/not-found";
import { initialsOf } from "#client/features/profiles/initials";

import { ForumPostDialog } from "./components/forum-post-dialog";
import { ReplyComposer } from "./components/reply-composer";
import {
  ForumPostNotFoundError,
  useCreateReplyMutation,
  useDeleteForumPostMutation,
  useDeleteReplyMutation,
  useForumPostQuery,
  usePostRepliesQuery,
  useUpdateForumPostMutation,
  useUpdateReplyMutation,
} from "./hooks/use-forum";

interface ForumPostPageProps {
  postId: string;
}

export function ForumPostPage({ postId }: ForumPostPageProps) {
  const { user, isAuthenticated, isVerified } = useSession();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  const postQuery = useForumPostQuery(postId);
  const repliesQuery = usePostRepliesQuery(postId);

  const createReplyMutation = useCreateReplyMutation(postId);
  const updateReplyMutation = useUpdateReplyMutation(postId);
  const deleteReplyMutation = useDeleteReplyMutation(postId);
  const updatePostMutation = useUpdateForumPostMutation(postId);
  const deletePostMutation = useDeleteForumPostMutation();
  const likePostMutation = useToggleForumPostLikeMutation(postId);
  const likeReplyMutation = useToggleForumReplyLikeMutation(postId);

  const post = postQuery.data;

  useEffect(() => {
    document.title = post ? `${post.title} — LocaLoco` : "Community forum — LocaLoco";
  }, [post]);

  if (postQuery.isPending) {
    return (
      <main className="bg-background min-h-screen">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </main>
    );
  }

  if (postQuery.error instanceof ForumPostNotFoundError) {
    return <NotFoundPage />;
  }

  if (postQuery.isError || !post) {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center p-6">
        <div className="border-border w-full max-w-md rounded-xl border p-8 text-center">
          <h1 className="text-xl font-bold">Could not load discussion</h1>
          <p className="text-muted-foreground mt-2 text-sm">{postQuery.error.message}</p>
          <Button
            className="mt-6"
            onClick={() => {
              void postQuery.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      </main>
    );
  }

  const replies = repliesQuery.data ? repliesQuery.data.pages.flatMap(page => page.items) : [];

  const handleReply = async (body: string) => {
    try {
      await createReplyMutation.mutateAsync({ body });
      toast.success("Reply published");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to publish reply");
    }
  };

  const handleSaveReplyEdit = async (reply: ForumReplyItem) => {
    try {
      await updateReplyMutation.mutateAsync({ replyId: reply.id, data: { body: editBody } });
      setEditingReplyId(null);
      toast.success("Reply updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update reply");
    }
  };

  const handleDeleteReply = async (reply: ForumReplyItem) => {
    try {
      await deleteReplyMutation.mutateAsync(reply.id);
      toast.success("Reply deleted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete reply");
    }
  };

  const handleSubmitPostEdit = async (formData: { title: string; body: string }) => {
    try {
      await updatePostMutation.mutateAsync({ title: formData.title, body: formData.body });
      setDialogOpen(false);
      toast.success("Post updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save post");
    }
  };

  const handleDeletePost = async () => {
    try {
      await deletePostMutation.mutateAsync(post.id);
      toast.success("Post deleted");
      await navigate({ to: "/forum" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete post");
    }
  };

  const handleTogglePostLike = async () => {
    if (!isAuthenticated) {
      toast.error("Sign in to like discussions");
      return;
    }
    if (!isVerified) {
      toast.error("Verify your email to like discussions");
      return;
    }
    try {
      await likePostMutation.mutateAsync({ isLiked: post.isLiked });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update like");
    }
  };

  const handleToggleReplyLike = async (reply: ForumReplyItem) => {
    if (!isAuthenticated) {
      toast.error("Sign in to like replies");
      return;
    }
    if (!isVerified) {
      toast.error("Verify your email to like replies");
      return;
    }
    try {
      await likeReplyMutation.mutateAsync({ replyId: reply.id, isLiked: reply.isLiked });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update like");
    }
  };

  const isPostAuthor = user?.id === post.userId;

  return (
    <main className="bg-background min-h-screen pb-16">
      <link rel="canonical" href={`${window.location.origin}/forum/${post.id}`} />
      <meta name="description" content={post.title} />

      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <Link
          to="/forum"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeftIcon className="size-4" />
          Back to forum
        </Link>

        <article className="flex flex-col gap-4 rounded-lg border p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar size="sm">
                {post.author.avatarUrl ? (
                  <AvatarImage src={post.author.avatarUrl} alt={post.author.displayName} />
                ) : null}
                <AvatarFallback>{initialsOf(post.author.displayName)}</AvatarFallback>
              </Avatar>
              <div>
                <span className="text-foreground text-sm font-semibold">
                  {post.author.displayName}
                </span>
                <time
                  dateTime={new Date(post.createdAt).toISOString()}
                  className="text-muted-foreground block text-xs"
                >
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                </time>
              </div>
            </div>

            {isPostAuthor ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDialogOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    void handleDeletePost();
                  }}
                >
                  Delete
                </Button>
              </div>
            ) : null}
          </div>

          <h1 className="text-foreground text-2xl font-bold tracking-tight">{post.title}</h1>

          <div className="flex items-center gap-2">
            <Badge variant="secondary">{post.business.name}</Badge>
            {post.business.category ? (
              <span className="text-muted-foreground text-xs">{post.business.category}</span>
            ) : null}
          </div>

          <p className="text-foreground text-sm leading-relaxed break-words whitespace-pre-wrap">
            {post.body}
          </p>

          <div className="flex items-center justify-start border-t pt-3">
            <LikeButton
              isLiked={post.isLiked}
              likeCount={post.likeCount}
              onToggle={() => {
                void handleTogglePostLike();
              }}
              isPending={likePostMutation.isPending}
              disabled={!isAuthenticated || !isVerified}
              ariaLabel={post.isLiked ? "Unlike post" : "Like post"}
            />
          </div>
        </article>

        <section aria-labelledby="replies-heading" className="flex flex-col gap-4">
          <h2 id="replies-heading" className="text-foreground text-xl font-bold tracking-tight">
            {post.replyCount === 1 ? "1 reply" : `${post.replyCount} replies`}
          </h2>

          {repliesQuery.isError ? (
            <div className="bg-muted/50 rounded-lg border p-4 text-center">
              <p className="text-muted-foreground text-sm">Could not load replies at this time.</p>
            </div>
          ) : replies.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No replies yet. Be the first to join the discussion.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {replies.map(reply => (
                <article
                  key={reply.id}
                  className="bg-card text-card-foreground flex flex-col gap-2 rounded-lg border p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Avatar size="sm">
                        {reply.author.avatarUrl ? (
                          <AvatarImage
                            src={reply.author.avatarUrl}
                            alt={reply.author.displayName}
                          />
                        ) : null}
                        <AvatarFallback>{initialsOf(reply.author.displayName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="text-foreground text-sm font-semibold">
                          {reply.author.displayName}
                        </span>
                        <time
                          dateTime={new Date(reply.createdAt).toISOString()}
                          className="text-muted-foreground block text-xs"
                        >
                          {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                        </time>
                      </div>
                    </div>

                    {user?.id === reply.userId ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingReplyId(reply.id);
                            setEditBody(reply.body);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            void handleDeleteReply(reply);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  {editingReplyId === reply.id ? (
                    <div className="flex flex-col gap-2">
                      <Textarea
                        aria-label="Edit reply"
                        value={editBody}
                        rows={3}
                        maxLength={4000}
                        onChange={e => {
                          setEditBody(e.target.value);
                        }}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingReplyId(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={!editBody.trim() || updateReplyMutation.isPending}
                          onClick={() => {
                            void handleSaveReplyEdit(reply);
                          }}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-foreground text-sm leading-relaxed break-words whitespace-pre-wrap">
                      {reply.body}
                    </p>
                  )}

                  <div className="mt-1 flex items-center justify-start border-t pt-2">
                    <LikeButton
                      isLiked={reply.isLiked}
                      likeCount={reply.likeCount}
                      onToggle={() => void handleToggleReplyLike(reply)}
                      isPending={likeReplyMutation.isPending}
                      disabled={!isAuthenticated || !isVerified}
                      ariaLabel={reply.isLiked ? "Unlike reply" : "Like reply"}
                    />
                  </div>
                </article>
              ))}

              {repliesQuery.hasNextPage ? (
                <div className="mt-2 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void repliesQuery.fetchNextPage();
                    }}
                    disabled={repliesQuery.isFetchingNextPage}
                  >
                    {repliesQuery.isFetchingNextPage ? "Loading more…" : "Load more replies"}
                  </Button>
                </div>
              ) : null}
            </div>
          )}

          <ReplyComposer onReply={handleReply} isPending={createReplyMutation.isPending} />
        </section>
      </div>

      <ForumPostDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        postToEdit={post}
        onSubmit={handleSubmitPostEdit}
        isPending={updatePostMutation.isPending}
      />
    </main>
  );
}
