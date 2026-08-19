import type {
  AnnouncementItem,
  CreateAnnouncement,
  UpdateAnnouncement,
} from "#shared/contracts/announcements";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AnnouncementDetailPage } from "#client/features/announcements/announcement-detail-page";
import { AnnouncementCard } from "#client/features/announcements/components/announcement-card";
import { AnnouncementComposerDialog } from "#client/features/announcements/components/announcement-composer-dialog";
import { BusinessAnnouncementsSection } from "#client/features/announcements/components/business-announcements-section";
import { ListingAnnouncementsSection } from "#client/features/announcements/components/listing-announcements-section";

const { mockUseSession, mockNavigate } = vi.hoisted(() => ({
  mockUseSession: vi.fn<() => unknown>(),
  mockNavigate: vi.fn<() => Promise<void>>(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children: React.ReactNode;
    to: string;
    params?: Record<string, string>;
  }) => (
    <a href={to} data-params={JSON.stringify(params)}>
      {children}
    </a>
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
  });
}

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const sampleAnnouncement: AnnouncementItem = {
  id: "ann_1",
  businessId: "biz_1",
  userId: "usr_123",
  title: "Weekend Flash Sale",
  content: "Get 30% off all pastries this weekend only!",
  imageUrl: "https://images.example.com/pastry.jpg",
  linkUrl: "https://example.com/sale",
  startsAt: new Date("2026-08-01T00:00:00.000Z"),
  endsAt: new Date("2026-08-31T23:59:59.000Z"),
  status: "active",
  moderationReason: null,
  canonicalUrl: "/announcements/ann_1",
  business: { id: "biz_1", name: "Alice Bakery", category: "Cafe", uen: "T09LL0001A" },
  author: { id: "usr_123", displayName: "Alice Tan", avatarUrl: null },
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  updatedAt: new Date("2026-08-01T00:00:00.000Z"),
};

describe("AnnouncementCard", () => {
  it("renders announcement title, content, image, and external link", () => {
    renderWithClient(<AnnouncementCard announcement={sampleAnnouncement} />);

    expect(screen.getByText("Weekend Flash Sale")).toBeDefined();
    expect(screen.getByText("Get 30% off all pastries this weekend only!")).toBeDefined();
    expect(screen.getByText("Alice Bakery")).toBeDefined();
    expect(screen.getByText("Learn more / Order online")).toBeDefined();

    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toBe("https://images.example.com/pastry.jpg");
  });

  it("renders owner options button when isOwner is true", () => {
    const onEdit = vi.fn<(_ann: AnnouncementItem) => void>();
    const onDelete = vi.fn<(_ann: AnnouncementItem) => void>();

    renderWithClient(
      <AnnouncementCard
        announcement={sampleAnnouncement}
        isOwner
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    const btn = screen.getByLabelText("Announcement options");
    expect(btn).toBeDefined();
  });

  it("renders appropriate status badges for expired, scheduled, and moderated announcements", () => {
    const now = new Date();
    const expiredAnnouncement: AnnouncementItem = {
      ...sampleAnnouncement,
      id: "ann_exp",
      endsAt: new Date(now.getTime() - 86400000),
    };
    const scheduledAnnouncement: AnnouncementItem = {
      ...sampleAnnouncement,
      id: "ann_sched",
      startsAt: new Date(now.getTime() + 86400000),
    };
    const moderatedAnnouncement: AnnouncementItem = {
      ...sampleAnnouncement,
      id: "ann_mod",
      status: "moderated",
    };

    const { rerender } = renderWithClient(
      <AnnouncementCard announcement={expiredAnnouncement} isOwner />
    );
    expect(screen.getByText("Expired")).toBeDefined();

    rerender(<AnnouncementCard announcement={scheduledAnnouncement} isOwner />);
    expect(screen.getByText("Scheduled")).toBeDefined();

    rerender(<AnnouncementCard announcement={moderatedAnnouncement} isOwner />);
    expect(screen.getByText("Moderated")).toBeDefined();
  });
});

describe("ListingAnnouncementsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubSession();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders null when there are no announcements", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ items: [], nextCursor: null }, 200));

    const { container } = renderWithClient(<ListingAnnouncementsSection businessId="biz_1" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders announcements when present", async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse({ items: [sampleAnnouncement], nextCursor: null }, 200)
    );

    renderWithClient(<ListingAnnouncementsSection businessId="biz_1" />);
    await waitFor(() => {
      expect(screen.getByText("Announcements & Updates")).toBeDefined();
      expect(screen.getByText("Weekend Flash Sale")).toBeDefined();
    });
  });
});

describe("AnnouncementComposerDialog", () => {
  it("validates that end date does not precede start date", async () => {
    const onSubmit = vi
      .fn<(_values: CreateAnnouncement | UpdateAnnouncement) => Promise<void>>()
      .mockResolvedValue();

    renderWithClient(
      <AnnouncementComposerDialog
        open={true}
        onOpenChange={vi.fn<(_open: boolean) => void>()}
        onSubmit={onSubmit}
        isPending={false}
      />
    );

    const titleInput = screen.getByLabelText("Title");
    const contentInput = screen.getByLabelText("Content");
    const startsAtInput = screen.getByLabelText("Start Date (Optional)");
    const endsAtInput = screen.getByLabelText("End Date (Optional)");

    fireEvent.change(titleInput, { target: { value: "Promo Title" } });
    fireEvent.change(contentInput, { target: { value: "Promo Content Description" } });
    fireEvent.change(startsAtInput, { target: { value: "2026-09-30" } });
    fireEvent.change(endsAtInput, { target: { value: "2026-09-01" } });

    const submitBtn = screen.getByText("Publish announcement");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("End date cannot precede start date")).toBeDefined();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("BusinessAnnouncementsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubSession();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("disables post button and shows callout when listing is not published", async () => {
    fetchMock.mockImplementation(async () => jsonResponse({ items: [], nextCursor: null }, 200));

    renderWithClient(<BusinessAnnouncementsSection businessId="biz_1" listingStatus="draft" />);

    expect(screen.getByText("Publication required")).toBeDefined();
    const btn = screen.getByRole("button", { name: /Post announcement/i });
    expect(btn.hasAttribute("disabled")).toBe(true);
  });

  it("enables post button when listing is published", async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse({ items: [sampleAnnouncement], nextCursor: null }, 200)
    );

    renderWithClient(<BusinessAnnouncementsSection businessId="biz_1" listingStatus="published" />);

    const btn = screen.getByRole("button", { name: /Post announcement/i });
    expect(btn.hasAttribute("disabled")).toBe(false);

    await waitFor(() => {
      expect(screen.getByText("Weekend Flash Sale")).toBeDefined();
    });
  });
});

describe("AnnouncementDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubSession();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders announcement detail with title and content", async () => {
    fetchMock.mockImplementation(async () => jsonResponse(sampleAnnouncement, 200));

    renderWithClient(<AnnouncementDetailPage announcementId="ann_1" />);

    await waitFor(() => {
      expect(screen.getByText("Weekend Flash Sale")).toBeDefined();
      expect(screen.getByText("Get 30% off all pastries this weekend only!")).toBeDefined();
    });

    expect(document.title).toContain("Weekend Flash Sale — LocaLoco");
  });

  it("renders not found page when announcement returns 404", async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse({ error: { message: "Not found" } }, 404)
    );

    renderWithClient(<AnnouncementDetailPage announcementId="ann_nonexistent" />);

    await waitFor(() => {
      expect(screen.getByText(/Page not found/i)).toBeDefined();
    });
  });
});
