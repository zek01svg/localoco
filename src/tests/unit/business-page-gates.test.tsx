import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BusinessesPageGates } from "#client/features/businesses/components/page-gates";

const { mockUseSession } = vi.hoisted(() => ({
  mockUseSession: vi.fn<() => unknown>(),
}));

vi.mock("@tanstack/react-router", () => ({
  Navigate: ({ to }: { to: string }) => (
    <div data-testid="navigate-target" data-to={to}>
      Redirecting to {to}
    </div>
  ),
}));

vi.mock("#client/features/auth", () => ({
  useSession: () => mockUseSession(),
}));

describe("BusinessesPageGates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it("renders PageSkeleton while session query is pending", () => {
    mockUseSession.mockReturnValue({
      isPending: true,
      isAuthenticated: false,
      isVerified: false,
    });

    const { container } = render(
      <BusinessesPageGates>
        <div data-testid="protected-content">Secret Content</div>
      </BusinessesPageGates>
    );

    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });

  it("redirects unauthenticated users to /login", () => {
    mockUseSession.mockReturnValue({
      isPending: false,
      isAuthenticated: false,
      isVerified: false,
    });

    render(
      <BusinessesPageGates>
        <div data-testid="protected-content">Secret Content</div>
      </BusinessesPageGates>
    );

    const redirectEl = screen.getByTestId("navigate-target");
    expect(redirectEl).toBeInTheDocument();
    expect(redirectEl).toHaveAttribute("data-to", "/login");
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });

  it("renders VerifyEmailCard when user is signed in but email is not verified", () => {
    mockUseSession.mockReturnValue({
      isPending: false,
      isAuthenticated: true,
      isVerified: false,
    });

    render(
      <BusinessesPageGates>
        <div data-testid="protected-content">Secret Content</div>
      </BusinessesPageGates>
    );

    expect(screen.getByText("Verify your email first")).toBeInTheDocument();
    expect(screen.getByText(/Check your inbox for the verification link/iu)).toBeInTheDocument();
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });

  it("renders child content when user is signed in and email is verified", () => {
    mockUseSession.mockReturnValue({
      isPending: false,
      isAuthenticated: true,
      isVerified: true,
    });

    render(
      <BusinessesPageGates>
        <div data-testid="protected-content">Secret Content</div>
      </BusinessesPageGates>
    );

    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    expect(screen.getByText("Secret Content")).toBeInTheDocument();
  });
});
