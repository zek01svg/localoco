import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LoginForm, SignupForm, VerifyEmailView } from "#client/features/auth";

const { mockSignUpEmail, mockSignInEmail, mockVerifyEmail, mockSignOut, mockNavigate } = vi.hoisted(
  () => ({
    mockSignUpEmail: vi.fn<(_args: unknown) => Promise<unknown>>(),
    mockSignInEmail: vi.fn<(_args: unknown) => Promise<unknown>>(),
    mockVerifyEmail: vi.fn<(_args: unknown) => Promise<unknown>>(),
    mockSignOut: vi.fn<() => Promise<unknown>>(),
    mockNavigate: vi.fn<(_args: unknown) => Promise<unknown>>(),
  })
);

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    className,
  }: {
    children: React.ReactNode;
    to: string;
    className?: string;
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  useNavigate: () => mockNavigate,
  createFileRoute: () => () => ({}),
}));

vi.mock("#client/lib/auth", () => ({
  auth: {
    signUp: {
      email: mockSignUpEmail,
    },
    signIn: {
      email: mockSignInEmail,
    },
    verifyEmail: mockVerifyEmail,
    signOut: mockSignOut,
    useSession: () => ({
      data: null,
      isPending: false,
      error: null,
    }),
  },
}));

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("SignupForm registration", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders signup fields and handles successful registration", async () => {
    mockSignUpEmail.mockResolvedValueOnce({ data: { user: { id: "1" } }, error: null });

    renderWithQueryClient(<SignupForm />);

    expect(screen.getByLabelText(/Full Name/iu)).toBeDefined();
    expect(screen.getByLabelText(/Email/iu)).toBeDefined();
    expect(screen.getByLabelText(/^Password/iu)).toBeDefined();
    expect(screen.getByLabelText(/Confirm Password/iu)).toBeDefined();

    fireEvent.change(screen.getByLabelText(/Full Name/iu), { target: { value: "Alice Tan" } });
    fireEvent.change(screen.getByLabelText(/Email/iu), { target: { value: "alice@example.com" } });
    fireEvent.change(screen.getByLabelText(/^Password/iu), { target: { value: "Password123!" } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/iu), {
      target: { value: "Password123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Join LocaLoco/iu }));

    await waitFor(() => {
      expect(mockSignUpEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Alice Tan",
          email: "alice@example.com",
          password: "Password123!",
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Check your email/iu)).toBeDefined();
    });
  });
});

describe("SignupForm validation", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates password mismatch before calling signup API", () => {
    renderWithQueryClient(<SignupForm />);

    fireEvent.change(screen.getByLabelText(/Full Name/iu), { target: { value: "Alice Tan" } });
    fireEvent.change(screen.getByLabelText(/Email/iu), { target: { value: "alice@example.com" } });
    fireEvent.change(screen.getByLabelText(/^Password/iu), { target: { value: "Password123!" } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/iu), {
      target: { value: "DifferentPassword!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Join LocaLoco/iu }));

    expect(screen.getByText(/Passwords do not match/iu)).toBeDefined();
    expect(mockSignUpEmail).not.toHaveBeenCalled();
  });
});

describe("LoginForm component", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders login fields and submits valid credentials", async () => {
    mockSignInEmail.mockResolvedValueOnce({ data: { session: { id: "s1" } }, error: null });

    renderWithQueryClient(<LoginForm />);

    expect(screen.getByLabelText(/Email/iu)).toBeDefined();
    expect(screen.getByLabelText(/Password/iu)).toBeDefined();

    fireEvent.change(screen.getByLabelText(/Email/iu), { target: { value: "alice@example.com" } });
    fireEvent.change(screen.getByLabelText(/Password/iu), { target: { value: "Password123!" } });

    fireEvent.click(screen.getByRole("button", { name: /Sign In/iu }));

    await waitFor(() => {
      expect(mockSignInEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "alice@example.com",
          password: "Password123!",
        })
      );
    });
  });
});

describe("VerifyEmailView component", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("verifies token on mount and displays success message", async () => {
    mockVerifyEmail.mockResolvedValueOnce({ data: { status: true }, error: null });

    renderWithQueryClient(<VerifyEmailView token="valid_test_token" />);

    await waitFor(() => {
      expect(mockVerifyEmail).toHaveBeenCalledWith({
        query: { token: "valid_test_token" },
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Email verified successfully/iu)).toBeDefined();
    });
  });

  it("displays error when token verification fails", async () => {
    mockVerifyEmail.mockResolvedValueOnce({
      data: null,
      error: { message: "Invalid or expired token" },
    });

    renderWithQueryClient(<VerifyEmailView token="expired_test_token" />);

    await waitFor(() => {
      expect(screen.getByText(/Verification failed/iu)).toBeDefined();
    });
  });
});
