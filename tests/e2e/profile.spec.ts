import { expect } from "@playwright/test";

import { createAndLoginUser, createVerifiedUser } from "./helpers/auth";
import { expectNoA11yViolations, test } from "./helpers/test";

test.describe("User Profile Flows E2E", () => {
  test("displays authenticated user profile, sections, and passes accessibility audit", async ({
    page,
  }) => {
    const user = await createAndLoginUser(page);

    await page.goto("/profile");

    // Profile header
    await expect(
      page.getByRole("heading", { level: 1, name: new RegExp(user.name, "iu") })
    ).toBeVisible();
    await expect(page.getByText(user.email)).toBeVisible();
    await expect(page.getByText("Unverified")).toBeVisible();

    // Profile details section
    await expect(page.getByRole("heading", { level: 2, name: "Profile details" })).toBeVisible();
    await expect(page.getByLabel("Display name")).toHaveValue(user.name);

    // Email address section
    await expect(page.getByRole("heading", { level: 2, name: "Email address" })).toBeVisible();

    // Saved bookmarks section shows the empty state for a fresh user
    await expect(page.getByRole("heading", { level: 2, name: "Saved bookmarks" })).toBeVisible();
    await expect(page.getByText("You haven't bookmarked any businesses yet.")).toBeVisible();

    // Owned businesses section is gated behind email verification
    await expect(page.getByRole("heading", { level: 2, name: "Owned businesses" })).toBeVisible();
    await expect(page.getByText("Verify your email to manage businesses you own.")).toBeVisible();

    // Danger zone / Delete account safety section
    await expect(page.getByRole("heading", { level: 2, name: "Danger zone" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete account" })).toBeVisible();

    // Accessibility check
    await expectNoA11yViolations(page);
  });

  test("verified user sees the owned businesses empty state and can edit display name", async ({
    page,
  }) => {
    const user = await createVerifiedUser(page);

    await page.goto("/profile");

    // Verified badge replaces the unverified one
    await expect(page.getByText("Verified")).toBeVisible();

    // Owned businesses section renders the empty state for a fresh user
    await expect(page.getByText("You do not own any businesses yet.")).toBeVisible();

    const nameInput = page.getByLabel("Display name");
    await expect(nameInput).toHaveValue(user.name);

    const updatedName = `${user.name} Edited`;
    await nameInput.fill(updatedName);

    const saveButton = page.getByRole("button", { name: "Save changes" });
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // Heading and input reflect updated display name
    await expect(
      page.getByRole("heading", { level: 1, name: new RegExp(updatedName, "iu") })
    ).toBeVisible({ timeout: 10_000 });
  });
});
