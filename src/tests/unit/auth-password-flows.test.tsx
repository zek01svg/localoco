import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ForgotPasswordForm } from "#client/features/auth/components/forgot-password-form";
import { ResetPasswordForm } from "#client/features/auth/components/reset-password-form";

const {
  mockRequestResetMutate,
  mockRequestResetState,
  mockResetPasswordMutate,
  mockResetPasswordState,
} = vi.hoisted(() => ({
  mockRequestResetMutate: vi.fn<(_email: string) => void>(),
  mockRequestResetState: { isPending: false, isSuccess: false, error: null as Error | null },
  mockResetPasswordMutate: vi.fn<(_payload: { token: string; newPassword: string }) => void>(),
  mockResetPasswordState: { isPending: false, isSuccess: false, error: null as Error | null },
}));

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
}));

vi.mock("#client/features/auth/hooks/auth-queries", () => ({
  useRequestPasswordResetMutation: () => ({
    mutate: mockRequestResetMutate,
    ...mockRequestResetState,
  }),
  useResetPasswordMutation: () => ({
    mutate: mockResetPasswordMutate,
    ...mockResetPasswordState,
  }),
}));

describe("ForgotPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequestResetState.isPending = false;
    mockRequestResetState.isSuccess = false;
    mockRequestResetState.error = null;
  });

  afterEach(cleanup);

  it("renders email field and submit button", () => {
    render(<ForgotPasswordForm />);

    expect(screen.getByRole("heading", { name: "Forgot your password?" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email/iu)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send Reset Link" })).toBeInTheDocument();
  });

  it("validates email input and prevents submission when invalid", async () => {
    render(<ForgotPasswordForm />);

    const emailInput = screen.getByLabelText(/^Email/iu);
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });

    await waitFor(() => {
      expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole("button", { name: "Send Reset Link" });
    expect(submitBtn).toBeDisabled();
  });

  it("submits valid email to request reset mutation", async () => {
    render(<ForgotPasswordForm />);

    const emailInput = screen.getByLabelText(/^Email/iu);
    fireEvent.change(emailInput, { target: { value: "user@example.com" } });

    const submitBtn = screen.getByRole("button", { name: "Send Reset Link" });
    await waitFor(() => {
      expect(submitBtn).not.toBeDisabled();
    });

    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(mockRequestResetMutate).toHaveBeenCalledWith("user@example.com");
    });
  });

  it("renders check email success confirmation when mutation succeeds", () => {
    mockRequestResetState.isSuccess = true;

    render(<ForgotPasswordForm />);

    expect(screen.getByRole("heading", { name: "Check your email" })).toBeInTheDocument();
    expect(screen.getByText(/password reset link is on its way/iu)).toBeInTheDocument();
  });

  it("renders error alert when mutation fails", () => {
    mockRequestResetState.error = new Error("Rate limit exceeded. Try again in 15 minutes.");

    render(<ForgotPasswordForm />);

    expect(screen.getByText("Rate limit exceeded. Try again in 15 minutes.")).toBeInTheDocument();
  });
});

describe("ResetPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResetPasswordState.isPending = false;
    mockResetPasswordState.isSuccess = false;
    mockResetPasswordState.error = null;
  });

  afterEach(cleanup);

  it("renders error state when token is missing or empty", () => {
    render(<ResetPasswordForm />);

    expect(screen.getByRole("heading", { name: "Reset link failed" })).toBeInTheDocument();
    expect(screen.getByText(/No reset token was provided in the link/iu)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Request a new link" })).toHaveAttribute(
      "href",
      "/forgot-password"
    );
  });

  it("validates password length and matching confirmation", async () => {
    render(<ResetPasswordForm token="valid_reset_token" />);

    const passwordInput = screen.getByLabelText(/^New password/iu);
    const confirmInput = screen.getByLabelText(/^Confirm new password/iu);
    const submitBtn = screen.getByRole("button", { name: "Update Password" });

    // Too short
    fireEvent.change(passwordInput, { target: { value: "short" } });
    await waitFor(() => {
      expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
    });
    expect(submitBtn).toBeDisabled();

    // Mismatch
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmInput, { target: { value: "password456" } });
    await waitFor(() => {
      expect(submitBtn).toBeDisabled();
    });

    // Match
    fireEvent.change(confirmInput, { target: { value: "password123" } });
    await waitFor(() => {
      expect(screen.queryByText("Password must be at least 8 characters")).not.toBeInTheDocument();
      expect(submitBtn).not.toBeDisabled();
    });
  });

  it("submits token and new password on form submit", async () => {
    render(<ResetPasswordForm token="secret_token_abc" />);

    fireEvent.change(screen.getByLabelText(/^New password/iu), {
      target: { value: "validpassword123" },
    });
    fireEvent.change(screen.getByLabelText(/^Confirm new password/iu), {
      target: { value: "validpassword123" },
    });

    const submitBtn = screen.getByRole("button", { name: "Update Password" });
    await waitFor(() => {
      expect(submitBtn).not.toBeDisabled();
    });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockResetPasswordMutate).toHaveBeenCalledWith({
        token: "secret_token_abc",
        newPassword: "validpassword123",
      });
    });
  });

  it("renders success state when password reset succeeds", () => {
    mockResetPasswordState.isSuccess = true;

    render(<ResetPasswordForm token="secret_token_abc" />);

    expect(screen.getByRole("heading", { name: "Password updated" })).toBeInTheDocument();
    expect(screen.getByText(/Your password has been changed/iu)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to Sign In" })).toHaveAttribute("href", "/login");
  });

  it("renders error message when reset mutation fails", () => {
    mockResetPasswordState.error = new Error("This reset link has expired.");

    render(<ResetPasswordForm token="expired_token" />);

    expect(screen.getByText("This reset link has expired.")).toBeInTheDocument();
  });
});
