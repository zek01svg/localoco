import type { ForumPostItem } from "#shared/contracts/forum";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ForumPostCard } from "#client/features/forum/components/forum-post-card";
import { ForumPostDialog } from "#client/features/forum/components/forum-post-dialog";
import { ReplyComposer } from "#client/features/forum/components/reply-composer";
import { ForumFeedPage } from "#client/features/forum/forum-feed-page";
import { ForumPostPage } from "#client/features/forum/forum-post-page";

const { mockUseSession, mockNavigate } = vi.hoisted(() => ({
  mockUseSession: vi.fn<() => unknown>(),
  mockNavigate: vi.fn<() => Promise<void>>(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useNavigate: () => mockNavigate,
  createFileRoute: () => () => ({}),
}));

vi.mock("#client/lib/auth", () => ({
  auth: {
    useSession: () => mockUseSession(),
    signOut: vi.fn<() => Promise<unknown>>(),
  },
}));

const fetchMock = vi.fn<(_url: string | URL | Request, _init?: RequestInit) => Promise<Response>>();

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function stubSession(userOverride?: { id?: string; emailVerified?: boolean } | null) {
  const user =
    userOverride === null
      ? null
      : {
          id: userOverride?.id ?? "usr_123",
          name: "Alice Tan",
          email: "alice@example.com",
          emailVerified: userOverride?.emailVerified ?? true,
        };
  const session = user ? { id: "sess_1" } : null;
  mockUseSession.mockReturnValue({
    session,
    user,
    data: { session, user },
    isPending: false,
    error: null,
    isAuthenticated: Boolean(session && user),
    isVerified: Boolean(user?.emailVerified),
    signOut: vi.fn<() => Promise<unknown>>(),
    refetch: vi.fn<() => Promise<unknown>>(),
  });
}

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const mockPost: ForumPostItem = {
  id: "post_1",
  businessId: "biz_1",
  userId: "usr_1",
  title: "Weekend crowd?",
  body: "How busy is it on Saturday mornings?",
  author: { id: "usr_1", displayName: "Alice Tan", avatarUrl: null },
  business: { id: "biz_1", name: "Kaya Toast Central", category: "Cafe" },
  replyCount: 3,
  likeCount: 0,
  isLiked: false,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("ForumPostCard component", () => {
  beforeEach(() => {
    stubSession();
  });
  afterEach(cleanup);

  it("renders title, author, business, and reply count", () => {
    renderWithQueryClient(<ForumPostCard post={mockPost} />);
    expect(screen.getByText("Weekend crowd?")).toBeDefined();
    expect(screen.getByText("Alice Tan")).toBeDefined();
    expect(screen.getByText("Kaya Toast Central")).toBeDefined();
    expect(screen.getByText(/3 replies/iu)).toBeDefined();
  });

  it("renders options button only when viewer is the author", () => {
    renderWithQueryClient(
      <ForumPostCard
        post={mockPost}
        currentUserId="usr_1"
        onEdit={vi.fn<(_post: ForumPostItem) => void>()}
        onDelete={vi.fn<(_post: ForumPostItem) => void>()}
      />
    );
    expect(screen.getByRole("button", { name: /Post options/iu })).toBeDefined();
  });

  it("hides options for other viewers", () => {
    renderWithQueryClient(<ForumPostCard post={mockPost} currentUserId="usr_2" />);
    expect(screen.queryByRole("button", { name: /Post options/iu })).toBeNull();
  });
});

describe("ForumPostDialog component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubSession();
    fetchMock.mockImplementation(async (input, _init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.includes("/api/listings/listing_1")) {
        return jsonResponse(
          {
            id: "listing_1",
            businessId: "biz_1",
            uen: "199000001A",
            name: "Kaya Toast Central",
            category: "Cafe",
            address: "1 Test Road",
            postalCode: "123456",
            phone: null,
            email: null,
            website: null,
            paymentOptions: null,
            priceRange: null,
            latitude: null,
            longitude: null,
            hours: [],
            photos: [],
          },
          200
        );
      }
      if (url.includes("/api/listings?")) {
        return jsonResponse(
          {
            items: [
              {
                id: "listing_1",
                name: "Kaya Toast Central",
                category: "Cafe",
                address: "1 Test Road",
                postalCode: "123456",
                phone: null,
                email: null,
                website: null,
                paymentOptions: null,
                priceRange: null,
                latitude: null,
                longitude: null,
              },
            ],
            nextCursor: null,
          },
          200
        );
      }
      return jsonResponse({ error: { code: "not_found", message: "Nope" } }, 404);
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("keeps publish disabled until title, body, and business are chosen", () => {
    renderWithQueryClient(
      <ForumPostDialog
        open={true}
        onOpenChange={() => {}}
        onSubmit={async () => {}}
        isPending={false}
      />
    );

    const publishBtn = screen.getByRole("button", { name: /Publish post/iu });
    expect(publishBtn.hasAttribute("disabled")).toBe(true);

    fireEvent.change(screen.getByPlaceholderText(/Post title/iu), {
      target: { value: "Is the laksa worth it?" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Share details/iu), {
      target: { value: "Planning a visit this weekend." },
    });
    expect(publishBtn.hasAttribute("disabled")).toBe(true);
  });

  it("searches businesses and submits with the selected business", async () => {
    const handleSubmit =
      vi.fn<(_data: { title: string; body: string; businessId?: string }) => Promise<void>>();
    renderWithQueryClient(
      <ForumPostDialog
        open={true}
        onOpenChange={() => {}}
        onSubmit={handleSubmit}
        isPending={false}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/Post title/iu), {
      target: { value: "Is the laksa worth it?" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Share details/iu), {
      target: { value: "Planning a visit this weekend." },
    });
    fireEvent.change(screen.getByPlaceholderText(/Search businesses/iu), {
      target: { value: "kaya" },
    });

    const businessOption = await screen.findByRole("button", { name: /Kaya Toast Central/iu });
    fireEvent.click(businessOption);

    const publishBtn = screen.getByRole("button", { name: /Publish post/iu });
    await waitFor(() => {
      expect(publishBtn.hasAttribute("disabled")).toBe(false);
    });
    fireEvent.click(publishBtn);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        businessId: "biz_1",
        title: "Is the laksa worth it?",
        body: "Planning a visit this weekend.",
      });
    });
  });

  it("pre-fills an existing post and hides the business picker in edit mode", () => {
    renderWithQueryClient(
      <ForumPostDialog
        open={true}
        onOpenChange={() => {}}
        postToEdit={mockPost}
        onSubmit={async () => {}}
        isPending={false}
      />
    );

    expect(screen.getByText("Edit your post")).toBeDefined();
    expect(screen.getByDisplayValue("Weekend crowd?")).toBeDefined();
    expect(screen.queryByPlaceholderText(/Search businesses/iu)).toBeNull();
    expect(screen.getByRole("button", { name: /Update post/iu })).toBeDefined();
  });
});

describe("ReplyComposer component", () => {
  afterEach(cleanup);

  it("tells anonymous visitors to sign in", () => {
    stubSession(null);
    renderWithQueryClient(<ReplyComposer />);
    expect(screen.getByText(/Sign in to join the discussion/iu)).toBeDefined();
  });

  it("tells unverified users to verify their email", () => {
    stubSession({ emailVerified: false });
    renderWithQueryClient(<ReplyComposer />);
    expect(screen.getByText(/Verify your email to reply/iu)).toBeDefined();
  });

  it("shows the composer to verified users and submits replies", async () => {
    stubSession();
    const handleReply = vi.fn<(_body: string) => Promise<void>>().mockResolvedValue();
    renderWithQueryClient(<ReplyComposer onReply={handleReply} isPending={false} />);

    const textarea = screen.getByPlaceholderText(/Write a reply/iu);
    fireEvent.change(textarea, { target: { value: "Usually packed after 11am." } });

    const replyBtn = screen.getByRole("button", { name: /Post reply/iu });
    expect(replyBtn.hasAttribute("disabled")).toBe(false);
    fireEvent.click(replyBtn);

    await waitFor(() => {
      expect(handleReply).toHaveBeenCalledWith("Usually packed after 11am.");
    });
  });
});

describe("ForumFeedPage component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubSession();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders posts from the public feed", async () => {
    fetchMock.mockImplementation(async (_input, _init) =>
      jsonResponse({ items: [mockPost], nextCursor: null }, 200)
    );

    renderWithQueryClient(<ForumFeedPage />);

    expect(await screen.findByText("Weekend crowd?")).toBeDefined();
    expect(screen.getByText("Kaya Toast Central")).toBeDefined();
    expect(screen.getByText(/3 replies/iu)).toBeDefined();
  });

  it("renders an honest empty state when the feed has no posts", async () => {
    fetchMock.mockImplementation(async (_input, _init) =>
      jsonResponse({ items: [], nextCursor: null }, 200)
    );

    renderWithQueryClient(<ForumFeedPage />);

    expect(await screen.findByText(/No discussions yet/iu)).toBeDefined();
    expect(screen.queryByText(/could not load/iu)).toBeNull();
  });

  it("renders a retryable error state distinct from the empty state", async () => {
    fetchMock.mockImplementation(async (_input, _init) => jsonResponse({}, 503));

    renderWithQueryClient(<ForumFeedPage />);

    expect(await screen.findByText(/Could not load discussions/iu)).toBeDefined();
    expect(screen.getByRole("button", { name: /Try again/iu })).toBeDefined();
    expect(screen.queryByText(/No discussions yet/iu)).toBeNull();
  });
});

describe("ForumPostPage component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubSession();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the discussion with author actions for the author", async () => {
    stubSession({ id: "usr_1" });
    fetchMock.mockImplementation(async input => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.endsWith("/forum/posts/post_1")) {
        return jsonResponse(mockPost, 200);
      }
      return jsonResponse({ items: [], nextCursor: null }, 200);
    });

    renderWithQueryClient(<ForumPostPage postId="post_1" />);

    expect(await screen.findByText("Weekend crowd?")).toBeDefined();
    expect(screen.getByRole("button", { name: /Edit/iu })).toBeDefined();
    expect(screen.getByRole("button", { name: /Delete/iu })).toBeDefined();
  });

  it("hides author actions from other viewers", async () => {
    fetchMock.mockImplementation(async input => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.endsWith("/forum/posts/post_1")) {
        return jsonResponse(mockPost, 200);
      }
      return jsonResponse({ items: [], nextCursor: null }, 200);
    });

    renderWithQueryClient(<ForumPostPage postId="post_1" />);

    expect(await screen.findByText("Weekend crowd?")).toBeDefined();
    expect(screen.queryByRole("button", { name: /Edit/iu })).toBeNull();
    expect(screen.queryByRole("button", { name: /Delete/iu })).toBeNull();
  });

  it("deletes the post and navigates back to the forum", async () => {
    stubSession({ id: "usr_1" });
    fetchMock.mockImplementation(async input => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.endsWith("/forum/posts/post_1")) {
        return jsonResponse(mockPost, 200);
      }
      return jsonResponse({}, 204);
    });

    renderWithQueryClient(<ForumPostPage postId="post_1" />);
    expect(await screen.findByText("Weekend crowd?")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Delete/iu }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/forum" });
    });
  });
});
