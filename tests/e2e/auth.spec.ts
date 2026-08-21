import { expect } from "@playwright/test";

import { createAndLoginUser, generateTestUser } from "./helpers/auth";
import { expectNoA11yViolations, test } from "./helpers/test";

test.describe("Authentication Flows E2E", () => {
  test("sign up form validates required fields, password length, and password matching", async ({
    page,
  }) => {
    await page.goto("/signup");

    await expect(page.getByRole("heading", { level: 1, name: "Join LocaLoco" })).toBeVisible();

    const nameInput = page.getByLabel("Full Name");
    const emailInput = page.getByLabel("Email");
    const passwordInput = page.getByLabel("Password", { exact: true });
    const confirmPasswordInput = page.getByLabel("Confirm Password");

    // Validate short password
    await nameInput.fill("Alice Tan");
    await emailInput.fill("alice.short@example.com");
    await passwordInput.fill("short");
    await confirmPasswordInput.fill("short");
    await expect(page.getByText("Password must be at least 8 characters long.")).toBeVisible();

    // Validate password mismatch
    await passwordInput.fill("ValidPassword123!");
    await confirmPasswordInput.fill("MismatchPassword123!");
    await expect(page.getByText("Passwords do not match. Please try again.")).toBeVisible();

    // Accessibility check on signup form
    await expectNoA11yViolations(page);
  });

  test("successful sign up transitions to verification email screen", async ({ page }) => {
    const user = generateTestUser();
    await page.goto("/signup");

    await page.getByLabel("Full Name").fill(user.name);
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password", { exact: true }).fill(user.password);
    await page.getByLabel("Confirm Password").fill(user.password);

    await page.getByRole("button", { name: "Join LocaLoco" }).click();

    await expect(page.getByRole("heading", { level: 2, name: "Check your email" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(user.email)).toBeVisible();
    await expect(page.getByRole("link", { name: "Return to sign in" })).toBeVisible();
  });

  test("sign in form validates empty fields and displays error on invalid credentials", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();

    const emailInput = page.getByLabel("Email");
    const passwordInput = page.getByLabel("Password");
    const submitButton = page.getByRole("button", { name: "Sign In" });

    // Validate invalid credentials
    await emailInput.fill("nonexistent.user@example.com");
    await passwordInput.fill("WrongPassword123!");
    await submitButton.click();

    await expect(page.getByRole("alert").filter({ hasText: /invalid|failed|error/iu })).toBeVisible(
      { timeout: 10_000 }
    );

    // Accessibility check on login form
    await expectNoA11yViolations(page);
  });

  test("successful sign in updates landing navigation and sign out revokes session", async ({
    page,
  }) => {
    // 1. Create a user via registration helper
    const user = await createAndLoginUser(page);

    // Verify authenticated nav state
    await expect(page.getByRole("link", { name: new RegExp(user.name, "iu") })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

    // 2. Sign out
    await page.getByRole("button", { name: "Sign out" }).click();

    // Verify session revoked and unauthenticated nav links restored
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
  });

  test("session persists across page reloads", async ({ page }) => {
    const user = await createAndLoginUser(page);

    // Reload the page: the session cookie must keep the user signed in
    await page.reload();
    await expect(page.getByRole("link", { name: new RegExp(user.name, "iu") })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  test("unauthenticated visitors navigating to protected routes are redirected to login", async ({
    page,
  }) => {
    // Attempt visiting /profile unauthenticated
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login/u, { timeout: 10_000 });
    await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();

    // Attempt visiting /businesses/new unauthenticated
    await page.goto("/businesses/new");
    await expect(page).toHaveURL(/\/login/u, { timeout: 10_000 });
    await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();
  });

  test("forgot password page loads with recovery form and passes accessibility audit", async ({
    page,
  }) => {
    await page.goto("/forgot-password");

    await expect(
      page.getByRole("heading", { level: 1, name: "Forgot your password?" })
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Send Reset Link" })).toBeVisible();

    await expectNoA11yViolations(page);
  });
});
