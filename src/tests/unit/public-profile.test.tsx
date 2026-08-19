import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PublicProfilePage } from "#client/features/profiles";

// jsdom never fires window.Image load events, and Radix Avatar renders its
// <img> only once the image reports loaded; complete + naturalWidth drive
// that, and the load listener is attached via addEventListener.
class FakeImage {
  complete = true;
  naturalWidth = 1;
  private listeners = new Map<string, (event: { currentTarget: FakeImage }) => void>();
  addEventListener(type: string, handler: (event: { currentTarget: FakeImage }) => void) {
    this.listeners.set(type, handler);
  }
  removeEventListener(type: string) {
    this.listeners.delete(type);
  }
  get src(): string {
    return "";
  }
  set src(_value: string) {
    this.listeners.get("load")?.({ currentTarget: this });
  }
}

const fetchMock = vi.fn<(_url: string | URL | Request, _init?: RequestInit) => Promise<Response>>();

function stubBrowser() {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("Image", FakeImage);
}

function unstubBrowser() {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
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

describe("PublicProfilePage", () => {
  beforeEach(stubBrowser);
  afterEach(unstubBrowser);
  it("renders the display name and avatar image from the public profile", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { id: "usr_123", displayName: "Alice Tan", avatarUrl: "https://cdn.example.com/alice.png" },
        200
      )
    );

    renderWithQueryClient(<PublicProfilePage userId="usr_123" />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Alice Tan" })).toBeDefined();
    });
    expect(screen.getByAltText("Alice Tan").getAttribute("src")).toBe(
      "https://cdn.example.com/alice.png"
    );
  });
});

describe("PublicProfilePage — fallbacks", () => {
  beforeEach(stubBrowser);
  afterEach(unstubBrowser);

  it("renders initials in the avatar when the User has no avatar image", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: "usr_123", displayName: "Bob Lee", avatarUrl: null }, 200)
    );

    renderWithQueryClient(<PublicProfilePage userId="usr_123" />);

    await waitFor(() => {
      expect(screen.getByText("BL")).toBeDefined();
    });
  });

  it("renders the not-found page when the API answers not_found", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { error: { code: "not_found", message: "User not found", requestId: "req-1" } },
        404
      )
    );

    renderWithQueryClient(<PublicProfilePage userId="usr_missing" />);

    await waitFor(() => {
      expect(screen.getByText("Page not found")).toBeDefined();
    });
  });
});

describe("PublicProfilePage — errors", () => {
  beforeEach(stubBrowser);
  afterEach(unstubBrowser);

  it("renders the error message when the profile cannot be loaded", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          error: {
            code: "dependency_unavailable",
            message: "Try again shortly.",
            requestId: "req-1",
          },
        },
        503
      )
    );

    renderWithQueryClient(<PublicProfilePage userId="usr_123" />);

    await waitFor(() => {
      expect(screen.getByText(/could not be loaded/iu)).toBeDefined();
    });
  });
});
