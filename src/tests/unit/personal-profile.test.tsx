import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

function urlOf(url: string | URL | Request): string {
  return typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
}

function bodyOf(call: [url: string | URL | Request, init?: RequestInit] | undefined): unknown {
  const raw = call?.[1]?.body;
  return typeof raw === "string" ? JSON.parse(raw) : null;
}

const PROFILE = {
  id: "usr_123",
  displayName: "Alice Tan",
  avatarUrl: null,
  email: "alice@example.com",
  emailVerified: true,
  createdAt: "2026-01-01T00:00:00.000Z",
};

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

describe("PersonalProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubSession();
    fetchMock.mockImplementation(async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.endsWith("/api/profile/email-change")) {
        return jsonResponse({ status: "confirmation_sent" }, 200);
      }
      if (url.endsWith("/api/profile")) {
        return jsonResponse(PROFILE, 200);
      }
      if (url.includes("/api/bookmarks")) {
        if (init?.method === "DELETE") {
          return jsonResponse({ status: "removed" }, 200);
        }
        return jsonResponse({ items: [], nextCursor: null }, 200);
      }
      if (url.endsWith("/api/businesses")) {
        return jsonResponse({ items: [{ id: "biz_1", uen: "202512345A" }], selectedId: null }, 200);
      }

      return jsonResponse(
        {
          error: { code: "not_found", message: "Not found", requestId: "req" },
        },
        404
      );
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the session user's profile details", async () => {
    renderWithQueryClient(<PersonalProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Alice Tan/iu })).toBeDefined();
    });
    expect(screen.getByText("alice@example.com")).toBeDefined();
    expect(screen.getByText("Verified")).toBeDefined();
    expect(screen.getByText("AT")).toBeDefined();
  });

  it("redirects to the sign-in page when there is no session", async () => {
    stubSession(null);

    renderWithQueryClient(<PersonalProfilePage />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "redirect" }).getAttribute("href")).toBe("/login");
    });
  });

  it("submits display name and avatar changes to PATCH /api/profile", async () => {
    renderWithQueryClient(<PersonalProfilePage />);

    await waitFor(() => {
      expect(screen.getByLabelText("Display name")).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText("Display name"), {
      target: { value: "Alice Tan Edited" },
    });
    fireEvent.change(screen.getByLabelText("Avatar image URL"), {
      target: { value: "https://cdn.example.com/alice.png" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      const patch = fetchMock.mock.calls.find(
        ([url, init]: [url: string | URL | Request, init?: RequestInit]) =>
          urlOf(url).endsWith("/api/profile") && init?.method === "PATCH"
      );
      expect(patch).toBeDefined();
      expect(bodyOf(patch)).toEqual({
        displayName: "Alice Tan Edited",
        avatarUrl: "https://cdn.example.com/alice.png",
      });
    });
  });

  it("requests an email change through POST /api/profile/email-change", async () => {
    renderWithQueryClient(<PersonalProfilePage />);

    await waitFor(() => {
      expect(screen.getByLabelText("New email address")).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText("New email address"), {
      target: { value: "alice.new@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Change email" }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(
        ([url, init]: [url: string | URL | Request, init?: RequestInit]) =>
          urlOf(url).endsWith("/api/profile/email-change") && init?.method === "POST"
      );
      expect(post).toBeDefined();
      expect(bodyOf(post)).toEqual({
        email: "alice.new@example.com",
      });
      expect(screen.getByText(/confirmation email is on its way/iu)).toBeDefined();
    });
  });

  it("shows owned businesses only when the email is verified", async () => {
    stubSession({ emailVerified: false });

    renderWithQueryClient(<PersonalProfilePage />);

    await waitFor(() => {
      expect(screen.getByText(/verify your email to manage businesses/iu)).toBeDefined();
    });
    const businessesFetch = fetchMock.mock.calls.find(([url]) =>
      urlOf(url).endsWith("/api/businesses")
    );
    expect(businessesFetch).toBeUndefined();
  });

  it("lists owned businesses when the email is verified", async () => {
    renderWithQueryClient(<PersonalProfilePage />);

    await waitFor(() => {
      expect(screen.getByText("202512345A")).toBeDefined();
    });
  });
});
