import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BookmarkButton } from "#client/features/bookmarks";
import { PersonalProfilePage } from "#client/features/profiles";

const { mockUseSession, mockNavigate } = vi.hoisted(() => ({
  mockUseSession: vi.fn<() => unknown>(),
  mockNavigate: vi.fn<(..._args: unknown[]) => unknown>(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  Navigate: ({ to }: { to: string }) => <a href={to}>redirect</a>,
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

function stubSession(userOverride?: { emailVerified?: boolean } | null) {
  const user =
    userOverride === null
      ? null
      : {
          id: "usr_123",
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

describe("BookmarkButton component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubSession();
    fetchMock.mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (init?.method === "DELETE") {
        return jsonResponse({ status: "removed" }, 200);
      }
      if (url.endsWith("/api/bookmarks/biz_1")) {
        return jsonResponse({ bookmarked: false, bookmark: null }, 200);
      }
      if (url.endsWith("/api/bookmarks/biz_saved")) {
        return jsonResponse(
          {
            bookmarked: true,
            bookmark: {
              id: "bmk_1",
              businessId: "biz_saved",
              createdAt: "2026-08-19T00:00:00.000Z",
            },
          },
          200
        );
      }
      if (url.endsWith("/api/bookmarks")) {
        return jsonResponse(
          {
            status: "bookmarked",
            bookmark: {
              id: "bmk_new",
              businessId: "biz_1",
              createdAt: "2026-08-19T00:00:00.000Z",
            },
          },
          200
        );
      }
      return jsonResponse({ status: "removed" }, 200);
    });

    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders Save bookmark button when not bookmarked and handles click to bookmark", async () => {
    renderWithQueryClient(<BookmarkButton businessId="biz_1" showText />);

    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /save bookmark/iu });
      expect(btn.getAttribute("disabled")).toBeNull();
    });

    const button = screen.getByRole("button", { name: /save bookmark/iu });
    expect(button.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(button);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/bookmarks",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ businessId: "biz_1" }),
        })
      );
    });
  });

  it("renders Saved button when already bookmarked and handles click to remove", async () => {
    renderWithQueryClient(<BookmarkButton businessId="biz_saved" showText />);

    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /remove bookmark/iu });
      expect(btn.getAttribute("disabled")).toBeNull();
    });

    const button = screen.getByRole("button", { name: /remove bookmark/iu });
    expect(button.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(button);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/bookmarks/biz_saved",
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });
  });

  it("disables the button when user is unverified", async () => {
    stubSession({ emailVerified: false });

    renderWithQueryClient(<BookmarkButton businessId="biz_1" />);

    await waitFor(() => {
      const button = screen.getByRole("button", { name: /save bookmark/iu });
      expect(button.getAttribute("disabled")).not.toBeNull();
    });
  });
});

describe("PersonalProfilePage BookmarksSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubSession();
    fetchMock.mockImplementation(async input => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.endsWith("/api/profile")) {
        return jsonResponse(
          {
            id: "usr_123",
            displayName: "Alice Tan",
            avatarUrl: null,
            email: "alice@example.com",
            emailVerified: true,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
          200
        );
      }
      if (url.includes("/api/bookmarks")) {
        return jsonResponse(
          {
            items: [
              {
                id: "bmk_1",
                businessId: "biz_100",
                createdAt: "2026-08-19T00:00:00.000Z",
                business: { id: "biz_100", uen: "202612345A" },
                listing: {
                  id: "lst_100",
                  name: "Maxwell Hainanese Rice",
                  category: "Food & Beverage",
                  address: "123 Maxwell Rd",
                  postalCode: "069111",
                  latitude: 1.28,
                  longitude: 103.85,
                  phone: null,
                  email: null,
                  website: null,
                  paymentOptions: null,
                  priceRange: null,
                },
              },
            ],
            nextCursor: null,
          },
          200
        );
      }
      if (url.endsWith("/api/businesses")) {
        return jsonResponse({ items: [], selectedId: null }, 200);
      }
      return jsonResponse({ status: "removed" }, 200);
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders saved bookmarks on personal profile and allows removing a bookmark", async () => {
    renderWithQueryClient(<PersonalProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("Maxwell Hainanese Rice")).toBeDefined();
      expect(screen.getByText(/Food & Beverage · 123 Maxwell Rd/u)).toBeDefined();
    });

    const removeBtn = screen.getByRole("button", { name: /remove/iu });
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/bookmarks/biz_100",
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });
});
