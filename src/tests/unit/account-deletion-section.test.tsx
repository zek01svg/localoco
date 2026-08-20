import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AccountDeletionSection } from "#client/features/profiles";

const { mockNavigate, mockSignOut } = vi.hoisted(() => ({
  mockNavigate: vi.fn<(..._args: unknown[]) => unknown>(),
  mockSignOut: vi.fn<() => Promise<unknown>>().mockResolvedValue(undefined),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("#client/lib/auth", () => ({
  auth: {
    signOut: () => mockSignOut(),
  },
}));

const fetchMock = vi.fn<(_url: string | URL | Request, _init?: RequestInit) => Promise<Response>>();

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const PREVIEW_DATA = {
  ownedListings: 2,
  authoredContributions: 7,
  affectedForumPosts: 3,
  thirdPartyReplies: 5,
};

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("AccountDeletionSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);

    fetchMock.mockImplementation(async input => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.endsWith("/api/profile/deletion-preview")) {
        return jsonResponse(PREVIEW_DATA, 200);
      }
      if (url.endsWith("/api/profile")) {
        return jsonResponse(
          { status: "account_deleted", deletedAt: new Date().toISOString() },
          200
        );
      }
      return jsonResponse(
        { error: { message: "Not found", code: "not_found", requestId: "req-1" } },
        404
      );
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the Danger zone section and trigger button", () => {
    renderWithQueryClient(<AccountDeletionSection />);

    expect(screen.getByRole("heading", { name: /danger zone/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /delete account/i })).toBeDefined();
  });

  it("opens the dialog, displays deletion preview counts, and shows third-party reply disclosure", async () => {
    renderWithQueryClient(<AccountDeletionSection />);

    fireEvent.click(screen.getByRole("button", { name: /delete account/i }));

    expect(
      await screen.findByRole("heading", { name: /permanently delete account/i })
    ).toBeDefined();

    // Verify preview counts appear in the dialog
    expect(await screen.findByText("2")).toBeDefined(); // 2 owned listings
    expect(await screen.findByText(/owned listings/i)).toBeDefined();
    expect(await screen.findByText("7")).toBeDefined(); // 7 authored contributions
    expect(await screen.findByText("3")).toBeDefined(); // 3 forum posts
    expect(await screen.findByText("5")).toBeDefined(); // 5 third-party replies

    // Verify disclosure alert is rendered
    expect(screen.getByText(/third-party content disclosure/i)).toBeDefined();
    expect(
      screen.getByText(
        /deleting forum posts you started will also permanently destroy all replies/i
      )
    ).toBeDefined();
  });

  it("keeps the delete button disabled until password and exact 'DELETE' confirmation are entered", async () => {
    renderWithQueryClient(<AccountDeletionSection />);

    fireEvent.click(screen.getByRole("button", { name: /delete account/i }));

    const submitBtn = await screen.findByRole("button", {
      name: /permanently delete account/i,
    });
    expect(submitBtn.hasAttribute("disabled")).toBe(true);

    const passwordInput = screen.getByLabelText(/current password/i);
    const confirmInput = screen.getByLabelText(/type.*delete.*to confirm/i);

    // Enter only password
    fireEvent.change(passwordInput, { target: { value: "SecretPassword123!" } });
    expect(submitBtn.hasAttribute("disabled")).toBe(true);

    // Enter lowercase "delete"
    fireEvent.change(confirmInput, { target: { value: "delete" } });
    expect(submitBtn.hasAttribute("disabled")).toBe(true);

    // Enter exact "DELETE"
    fireEvent.change(confirmInput, { target: { value: "DELETE" } });
    expect(submitBtn.hasAttribute("disabled")).toBe(false);
  });

  it("submits deletion request, calls signOut, and navigates to home page", async () => {
    renderWithQueryClient(<AccountDeletionSection />);

    fireEvent.click(screen.getByRole("button", { name: /delete account/i }));

    const passwordInput = await screen.findByLabelText(/current password/i);
    const confirmInput = screen.getByLabelText(/type.*delete.*to confirm/i);

    fireEvent.change(passwordInput, { target: { value: "SecretPassword123!" } });
    fireEvent.change(confirmInput, { target: { value: "DELETE" } });

    const submitBtn = screen.getByRole("button", { name: /permanently delete account/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/profile$/),
        expect.objectContaining({
          method: "DELETE",
          body: JSON.stringify({ password: "SecretPassword123!", confirmation: "DELETE" }),
        })
      );
    });

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
    });
  });

  it("displays an error alert when account deletion fails", async () => {
    fetchMock.mockImplementation(async input => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.endsWith("/api/profile/deletion-preview")) {
        return jsonResponse(PREVIEW_DATA, 200);
      }
      if (url.endsWith("/api/profile")) {
        return jsonResponse(
          {
            error: {
              message: "Invalid password provided",
              code: "unauthorized",
              requestId: "req-err-1",
            },
          },
          401
        );
      }
      return jsonResponse(
        { error: { message: "Not found", code: "not_found", requestId: "req-404" } },
        404
      );
    });

    renderWithQueryClient(<AccountDeletionSection />);

    fireEvent.click(screen.getByRole("button", { name: /delete account/i }));

    const passwordInput = await screen.findByLabelText(/current password/i);
    const confirmInput = screen.getByLabelText(/type.*delete.*to confirm/i);

    fireEvent.change(passwordInput, { target: { value: "WrongPassword" } });
    fireEvent.change(confirmInput, { target: { value: "DELETE" } });

    const submitBtn = screen.getByRole("button", { name: /permanently delete account/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText("Invalid password provided")).toBeDefined();
  });
});
