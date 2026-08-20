import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CreateBusinessPage } from "#client/features/businesses/create-business-page";

interface CreateCallbacks {
  onSuccess?: (created: { id: string }) => void;
}

const { mockNavigate, mockCreateBusinessMutate, mockUseSession } = vi.hoisted(() => ({
  mockNavigate: vi.fn<(_args: unknown) => Promise<unknown>>(),
  mockCreateBusinessMutate: vi.fn<(_data: unknown, _callbacks?: CreateCallbacks) => void>(),
  mockUseSession: vi.fn<() => unknown>(),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
}));

vi.mock("#client/features/auth", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("#client/features/businesses/hooks/business-queries", () => ({
  useCreateBusinessMutation: () => ({
    mutate: mockCreateBusinessMutate,
    isPending: false,
    error: null,
  }),
}));

function stubSession(verified = true) {
  const user = { id: "usr_1", emailVerified: verified };
  const session = { id: "sess_1" };
  mockUseSession.mockReturnValue({
    session,
    user,
    data: { session, user },
    isPending: false,
    error: null,
    isAuthenticated: true,
    isVerified: verified,
  });
}

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("CreateBusinessPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubSession(true);
  });

  afterEach(cleanup);

  it("renders business creation form with required fields", () => {
    renderWithClient(<CreateBusinessPage />);

    expect(screen.getByText("Add your business")).toBeInTheDocument();
    expect(screen.getByLabelText(/^UEN/iu)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Business name/iu)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Category/iu)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Address/iu)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Postal code/iu)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add business" })).toBeInTheDocument();
  });

  it("validates Singapore UEN format and required state", async () => {
    renderWithClient(<CreateBusinessPage />);

    const uenInput = screen.getByLabelText(/^UEN/iu);

    // Empty input validation
    fireEvent.change(uenInput, { target: { value: "   " } });
    await waitFor(() => {
      expect(screen.getByText("UEN is required")).toBeInTheDocument();
    });

    // Invalid format
    fireEvent.change(uenInput, { target: { value: "123456" } });
    await waitFor(() => {
      expect(screen.getByText("Enter a valid Singapore UEN")).toBeInTheDocument();
    });

    // Valid Singapore UEN format (e.g. 201800111A)
    fireEvent.change(uenInput, { target: { value: "201800111A" } });
    await waitFor(() => {
      expect(screen.queryByText("Enter a valid Singapore UEN")).not.toBeInTheDocument();
      expect(screen.queryByText("UEN is required")).not.toBeInTheDocument();
    });
  });

  it("submits valid form data to createBusinessMutation and navigates on success", async () => {
    renderWithClient(<CreateBusinessPage />);

    fireEvent.change(screen.getByLabelText(/^UEN/iu), { target: { value: "201800111A" } });
    fireEvent.change(screen.getByLabelText(/^Business name/iu), { target: { value: "Acme Cafe" } });
    fireEvent.change(screen.getByLabelText(/^Category/iu), {
      target: { value: "Food & Beverage" },
    });
    fireEvent.change(screen.getByLabelText(/^Address/iu), {
      target: { value: "123 Orchard Road" },
    });
    fireEvent.change(screen.getByLabelText(/^Postal code/iu), { target: { value: "238888" } });

    fireEvent.click(screen.getByRole("button", { name: "Add business" }));

    await waitFor(() => {
      expect(mockCreateBusinessMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          uen: "201800111A",
          listing: expect.objectContaining({
            name: "Acme Cafe",
            category: "Food & Beverage",
            address: "123 Orchard Road",
            postalCode: "238888",
          }),
        }),
        expect.any(Object)
      );
    });

    // Simulate mutation onSuccess callback
    const callbacks = mockCreateBusinessMutate.mock.calls[0]?.[1];
    callbacks?.onSuccess?.({ id: "biz_created_123" });

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/businesses/$id",
      params: { id: "biz_created_123" },
    });
  });
});
