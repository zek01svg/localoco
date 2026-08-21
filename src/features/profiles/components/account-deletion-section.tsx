"use client";

import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "#client/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "#client/components/ui/alert-dialog";
import { Button } from "#client/components/ui/button";
import { Input } from "#client/components/ui/input";
import { Label } from "#client/components/ui/label";
import { Skeleton } from "#client/components/ui/skeleton";
import { FormErrorAlert } from "#client/features/auth";
import { auth as authClient } from "#client/lib/auth";

import {
  useDeleteAccountMutation,
  useDeletionPreviewQuery,
} from "../hooks/personal-profile-queries";

export function AccountDeletionSection() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const navigate = useNavigate();

  const previewQuery = useDeletionPreviewQuery(open);
  const deleteMutation = useDeleteAccountMutation();

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setPassword("");
      setConfirmation("");
      deleteMutation.reset();
    }
  };

  const handleDelete = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    if (confirmation !== "DELETE" || !password || deleteMutation.isPending) {
      return;
    }

    deleteMutation.mutate(
      { password, confirmation: "DELETE" },
      {
        onSuccess: () => {
          void authClient.signOut().catch(() => {
            // Best effort sign out
          });
          setOpen(false);
          void navigate({ to: "/" });
        },
      }
    );
  };

  const canSubmit = confirmation === "DELETE" && password.length > 0 && !deleteMutation.isPending;
  const preview = previewQuery.data;

  return (
    <section
      aria-labelledby="danger-zone-heading"
      className="border-destructive/30 bg-destructive/5 rounded-xl border p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            id="danger-zone-heading"
            className="text-destructive flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <AlertTriangle className="size-5" />
            Danger zone
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Permanently destroy your personal account, owned businesses, and all authored
            contributions.
          </p>
        </div>

        <AlertDialog open={open} onOpenChange={handleOpenChange}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="shrink-0">
              <Trash2 className="mr-2 size-4" />
              Delete account
            </Button>
          </AlertDialogTrigger>

          <AlertDialogContent className="max-w-lg">
            <form onSubmit={handleDelete}>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-destructive text-xl">
                  Permanently delete account
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm">
                  This action is irreversible. All of your data will be permanently destroyed.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="my-4 space-y-4">
                {previewQuery.isPending ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : preview ? (
                  <div className="space-y-3">
                    <div className="bg-muted/50 rounded-lg p-3 text-sm">
                      <p className="font-medium">Data scheduled for destruction:</p>
                      <ul className="text-muted-foreground mt-2 grid grid-cols-2 gap-2 text-xs">
                        <li className="bg-background rounded border p-2">
                          <span className="text-foreground font-semibold">
                            {preview.ownedListings}
                          </span>{" "}
                          owned listing{preview.ownedListings === 1 ? "" : "s"}
                        </li>
                        <li className="bg-background rounded border p-2">
                          <span className="text-foreground font-semibold">
                            {preview.authoredContributions}
                          </span>{" "}
                          authored contribution{preview.authoredContributions === 1 ? "" : "s"}
                        </li>
                        <li className="bg-background rounded border p-2">
                          <span className="text-foreground font-semibold">
                            {preview.affectedForumPosts}
                          </span>{" "}
                          forum post{preview.affectedForumPosts === 1 ? "" : "s"}
                        </li>
                        <li className="bg-background rounded border p-2">
                          <span className="text-foreground font-semibold">
                            {preview.thirdPartyReplies}
                          </span>{" "}
                          third-party repl{preview.thirdPartyReplies === 1 ? "y" : "ies"}
                        </li>
                      </ul>
                    </div>

                    <Alert variant="destructive" className="py-2.5">
                      <AlertTitle className="text-xs font-semibold">
                        Third-party content disclosure
                      </AlertTitle>
                      <AlertDescription className="text-xs">
                        Deleting Forum posts you started will also permanently destroy all replies
                        on those posts, including{" "}
                        <strong>
                          {preview.thirdPartyReplies} repl
                          {preview.thirdPartyReplies === 1 ? "y" : "ies"}
                        </strong>{" "}
                        written by other users.
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : null}

                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="delete-password">Current password</Label>
                    <Input
                      id="delete-password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={e => {
                        setPassword(e.target.value);
                      }}
                      disabled={deleteMutation.isPending}
                      autoComplete="current-password"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="delete-confirm">
                      Type <span className="text-destructive font-bold">DELETE</span> to confirm
                    </Label>
                    <Input
                      id="delete-confirm"
                      type="text"
                      placeholder="DELETE"
                      value={confirmation}
                      onChange={e => {
                        setConfirmation(e.target.value);
                      }}
                      disabled={deleteMutation.isPending}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      required
                    />
                  </div>
                </div>

                {deleteMutation.error ? (
                  <FormErrorAlert message={deleteMutation.error.message} />
                ) : null}
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel type="button" disabled={deleteMutation.isPending}>
                  Cancel
                </AlertDialogCancel>
                <Button type="submit" variant="destructive" disabled={!canSubmit}>
                  {deleteMutation.isPending ? "Deleting..." : "Permanently delete account"}
                </Button>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
