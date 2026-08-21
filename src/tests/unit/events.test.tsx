import type { CreateEvent, EventItem, UpdateEvent } from "#shared/contracts/events";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BusinessEventsSection } from "#client/features/events/components/business-events-section";
import { EventCard } from "#client/features/events/components/event-card";
import { EventComposerDialog } from "#client/features/events/components/event-composer-dialog";
import { ListingEventsSection } from "#client/features/events/components/listing-events-section";
import { EventDetailPage } from "#client/features/events/event-detail-page";

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

const sampleEvent: EventItem = {
  id: "evt_1",
  businessId: "biz_1",
  userId: "usr_123",
  title: "Coffee Cupping Masterclass",
  description: "Learn how to evaluate specialty beans like a pro.",
  imageUrl: "https://images.example.com/coffee.jpg",
  linkUrl: "https://example.com/rsvp",
  startsAt: new Date("2026-09-01T10:00:00.000Z"),
  endsAt: new Date("2026-09-01T12:00:00.000Z"),
  status: "active",
  moderationReason: null,
  canonicalUrl: "/events/evt_1",
  business: { id: "biz_1", name: "Alice Bakery", category: "Cafe", uen: "T09LL0001A" },
  author: { id: "usr_123", displayName: "Alice Tan", avatarUrl: null },
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  updatedAt: new Date("2026-08-01T00:00:00.000Z"),
};

describe("EventCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders event title, description, image, and RSVP link", () => {
    renderWithClient(<EventCard event={sampleEvent} />);

    expect(screen.getByText("Coffee Cupping Masterclass")).toBeDefined();
    expect(screen.getByText("Learn how to evaluate specialty beans like a pro.")).toBeDefined();
    expect(screen.getByText("Alice Bakery")).toBeDefined();
    expect(screen.getByText("Event details / RSVP")).toBeDefined();

    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toBe("https://images.example.com/coffee.jpg");
  });

  it("renders owner options dropdown when isOwner is true", () => {
    const onEdit = vi.fn<(_evt: EventItem) => void>();
    const onDelete = vi.fn<(_evt: EventItem) => void>();

    renderWithClient(<EventCard event={sampleEvent} isOwner onEdit={onEdit} onDelete={onDelete} />);

    const btn = screen.getByLabelText("Event options");
    expect(btn).toBeDefined();
  });

  it("renders Expired badge for past events when isOwner is true", () => {
    const past = new Date(Date.now() - 86400000);
    const expiredEvent: EventItem = {
      ...sampleEvent,
      id: "evt_exp",
      startsAt: new Date(past.getTime() - 3600000),
      endsAt: past,
    };
    renderWithClient(<EventCard event={expiredEvent} isOwner />);
    expect(screen.getByText("Expired")).toBeDefined();
  });

  it("renders Upcoming badge for future events when isOwner is true", () => {
    const future = new Date(Date.now() + 86400000);
    const upcomingEvent: EventItem = {
      ...sampleEvent,
      id: "evt_up",
      startsAt: future,
      endsAt: new Date(future.getTime() + 3600000),
    };
    renderWithClient(<EventCard event={upcomingEvent} isOwner />);
    expect(screen.getByText("Upcoming")).toBeDefined();
  });

  it("renders Moderated badge when event status is moderated and isOwner is true", () => {
    const moderatedEvent: EventItem = {
      ...sampleEvent,
      id: "evt_mod",
      status: "moderated",
    };
    renderWithClient(<EventCard event={moderatedEvent} isOwner />);
    expect(screen.getByText("Moderated")).toBeDefined();
  });
});

describe("ListingEventsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubSession();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders null when there are no events", () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({ items: [], nextCursor: null }, 200))
    );

    const { container } = renderWithClient(<ListingEventsSection businessId="biz_1" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders events when present", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({ items: [sampleEvent], nextCursor: null }, 200))
    );

    renderWithClient(<ListingEventsSection businessId="biz_1" />);
    await waitFor(() => {
      expect(screen.getByText("Upcoming Events & Activities")).toBeDefined();
      expect(screen.getByText("Coffee Cupping Masterclass")).toBeDefined();
    });
  });
});

describe("EventComposerDialog", () => {
  it("validates that end date does not precede start date", async () => {
    const onSubmit = vi
      .fn<(_values: CreateEvent | UpdateEvent) => Promise<void>>()
      .mockResolvedValue();

    renderWithClient(
      <EventComposerDialog
        open={true}
        onOpenChange={vi.fn<(_open: boolean) => void>()}
        onSubmit={onSubmit}
        isPending={false}
      />
    );

    const titleInput = screen.getByLabelText("Title");
    const descInput = screen.getByLabelText("Description");
    const startsAtInput = screen.getByLabelText("Starts At");
    const endsAtInput = screen.getByLabelText("Ends At");

    fireEvent.change(titleInput, { target: { value: "Workshop Title" } });
    fireEvent.change(descInput, { target: { value: "Workshop Description" } });
    fireEvent.change(startsAtInput, { target: { value: "2026-09-30T18:00" } });
    fireEvent.change(endsAtInput, { target: { value: "2026-09-01T18:00" } });

    const submitBtn = screen.getByText("Publish event");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("End date must not precede start date")).toBeDefined();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("BusinessEventsSection", () => {
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
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({ items: [], nextCursor: null }, 200))
    );

    renderWithClient(<BusinessEventsSection businessId="biz_1" listingStatus="draft" />);

    await waitFor(() => {
      expect(screen.getByText("Publication required")).toBeDefined();
    });

    const btn = screen.getByRole("button", { name: /Post event/iu });
    expect(btn.hasAttribute("disabled")).toBe(true);
  });

  it("enables post button and displays events when listing is published", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({ items: [sampleEvent], nextCursor: null }, 200))
    );

    renderWithClient(<BusinessEventsSection businessId="biz_1" listingStatus="published" />);

    await waitFor(() => {
      expect(screen.getByText("Coffee Cupping Masterclass")).toBeDefined();
    });

    const btn = screen.getByRole("button", { name: /Post event/iu });
    expect(btn.hasAttribute("disabled")).toBe(false);
  });
});

describe("EventDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubSession();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders event details, dates, and canonical info", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(sampleEvent, 200)));

    renderWithClient(<EventDetailPage eventId="evt_1" />);

    await waitFor(() => {
      expect(screen.getByText("Coffee Cupping Masterclass")).toBeDefined();
      expect(screen.getByText("Learn how to evaluate specialty beans like a pro.")).toBeDefined();
      expect(screen.getByText("Alice Bakery")).toBeDefined();
      expect(screen.getByText("RSVP / View Event Link")).toBeDefined();
    });
  });

  it("renders not found view when API returns 404", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse({ error: "not_found" }, 404)));

    renderWithClient(<EventDetailPage eventId="evt_nonexistent" />);

    await waitFor(() => {
      expect(screen.getByText("Page not found")).toBeDefined();
    });
  });
});
