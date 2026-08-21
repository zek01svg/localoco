import { expect } from "@playwright/test";

import { createAndLoginUser, createVerifiedUser } from "./helpers/auth";
import { expectNoA11yViolations, test } from "./helpers/test";

test.describe("Business Management Flows E2E", () => {
  test("blocks unverified members with email verification prompt", async ({ page }) => {
    await createAndLoginUser(page);

    await page.goto("/businesses/new");

    await expect(page.getByText("Verify your email first")).toBeVisible();
    await expect(
      page.getByText("Check your inbox for the verification link to continue.")
    ).toBeVisible();
  });

  test("verified member accesses business creation form and validates required inputs on submit", async ({
    page,
  }) => {
    await createVerifiedUser(page);

    await page.goto("/businesses/new");

    await expect(page.getByText("Add your business")).toBeVisible();

    const uenInput = page.getByLabel("UEN");
    const nameInput = page.getByLabel("Business name");
    const categoryInput = page.getByLabel("Category");
    const addressInput = page.getByLabel("Address");
    const postalCodeInput = page.getByLabel("Postal code");

    await expect(uenInput).toBeVisible();
    await expect(nameInput).toBeVisible();
    await expect(categoryInput).toBeVisible();
    await expect(addressInput).toBeVisible();
    await expect(postalCodeInput).toBeVisible();

    // Submitting an empty form surfaces required-field errors and does not navigate
    await page.getByRole("button", { name: "Add business" }).click();
    await expect(page.getByText("UEN is required")).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/businesses\/new$/u);

    // Validate invalid Singapore UEN format
    await uenInput.fill("INVALID_UEN");
    await expect(page.getByText("Enter a valid Singapore UEN")).toBeVisible();

    // Enter valid Singapore UEN
    await uenInput.fill("202400123A");
    await expect(page.getByText("Enter a valid Singapore UEN")).not.toBeVisible();

    // Accessibility check on business creation page
    await expectNoA11yViolations(page);
  });
});
