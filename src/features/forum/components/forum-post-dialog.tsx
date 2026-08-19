import type { ForumPostItem } from "#shared/contracts/forum";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Button } from "#client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#client/components/ui/dialog";
import { Input } from "#client/components/ui/input";
import { Label } from "#client/components/ui/label";
import { Textarea } from "#client/components/ui/textarea";
import { useDebounce } from "#client/hooks/use-debounce";
import { apiUrl } from "#client/lib/api";
import { listingsResponseSchema, publicListingDetailSchema } from "#shared/contracts/listings";

interface ForumPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postToEdit?: ForumPostItem | null;
  onSubmit: (data: { title: string; body: string; businessId?: string }) => Promise<void>;
  isPending: boolean;
}

export function ForumPostDialog({
  open,
  onOpenChange,
  postToEdit,
  onSubmit,
  isPending,
}: ForumPostDialogProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [q, setQ] = useState("");
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [selectFailed, setSelectFailed] = useState(false);
  const debouncedQ = useDebounce(q, 350);

  const isEditing = Boolean(postToEdit);

  useEffect(() => {
    if (open) {
      setTitle(postToEdit?.title ?? "");
      setBody(postToEdit?.body ?? "");
      setBusinessId(postToEdit ? postToEdit.businessId : "");
      setBusinessName(postToEdit ? postToEdit.business.name : "");
      setQ("");
      setSelectingId(null);
      setSelectFailed(false);
    }
  }, [open, postToEdit]);

  const businessSearch = useQuery({
    queryKey: ["forum-business-search", debouncedQ],
    queryFn: async () => {
      const url = new URL(`${apiUrl}/listings`);
      url.searchParams.set("limit", "5");
      if (debouncedQ) {
        url.searchParams.set("q", debouncedQ);
      }
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error("Could not search businesses");
      }
      return listingsResponseSchema.parse(await res.json());
    },
    enabled: open && !isEditing && debouncedQ.trim().length > 0,
    retry: false,
  });

  const canSubmit = Boolean(title.trim() && body.trim() && (isEditing || businessId));

  const searchResults =
    !businessSearch.isPending && !businessSearch.isError ? businessSearch.data.items : [];

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await onSubmit(
      isEditing
        ? { title: title.trim(), body: body.trim() }
        : { businessId, title: title.trim(), body: body.trim() }
    );
  };

  // Search results are public Listings; the Business id lives on the Listing
  // detail, so selection resolves it with one detail fetch.
  const selectBusiness = async (listingId: string) => {
    setSelectingId(listingId);
    setSelectFailed(false);
    try {
      const res = await fetch(`${apiUrl}/listings/${encodeURIComponent(listingId)}`);
      if (!res.ok) {
        throw new Error("Listing not found");
      }
      const detail = publicListingDetailSchema.parse(await res.json());
      setBusinessId(detail.businessId);
      setBusinessName(detail.name);
      setQ("");
    } catch {
      setSelectFailed(true);
    } finally {
      setSelectingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit your post" : "Start a discussion"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the title or body of your forum post."
              : "Ask the community about a local business. Every discussion is tied to a Business."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="forum-post-title">Title</Label>
            <Input
              id="forum-post-title"
              placeholder="Post title"
              value={title}
              maxLength={200}
              onChange={e => {
                setTitle(e.target.value);
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="forum-post-body">Body</Label>
            <Textarea
              id="forum-post-body"
              placeholder="Share details, ask a question…"
              value={body}
              rows={5}
              maxLength={4000}
              onChange={e => {
                setBody(e.target.value);
              }}
            />
          </div>

          {isEditing ? null : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="forum-post-business">Business</Label>
              {businessName ? (
                <div className="bg-muted/50 flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span className="text-foreground">{businessName}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setBusinessId("");
                      setBusinessName("");
                    }}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <Input
                    id="forum-post-business"
                    placeholder="Search businesses"
                    value={q}
                    onChange={e => {
                      setQ(e.target.value);
                    }}
                  />
                  {selectingId ? (
                    <p className="text-muted-foreground text-xs">Loading business…</p>
                  ) : selectFailed ? (
                    <p className="text-muted-foreground text-xs">
                      Could not load that business. Try another one.
                    </p>
                  ) : businessSearch.isPending ? (
                    <p className="text-muted-foreground text-xs">Searching…</p>
                  ) : businessSearch.isError ? (
                    <p className="text-muted-foreground text-xs">
                      Could not search businesses right now.
                    </p>
                  ) : (
                    searchResults.map(item => (
                      <Button
                        key={item.id}
                        type="button"
                        variant="outline"
                        className="justify-start"
                        onClick={() => {
                          void selectBusiness(item.id);
                        }}
                      >
                        {item.name}
                      </Button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button disabled={!canSubmit || isPending} onClick={() => void handleSubmit()}>
            {isPending ? "Saving…" : isEditing ? "Update post" : "Publish post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
