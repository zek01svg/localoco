import { expect } from "@playwright/test";

import { expectNoA11yViolations, SEEDED_LISTING_ID, test } from "./helpers/test";

test.describe("Discovery & Search Flows E2E", () => {
  test("displays published businesses directory and category options", async ({ page }) => {
    await page.goto("/listings");

    await expect(
      page.getByRole("heading", { level: 1, name: "Discover local businesses" })
    ).toBeVisible();

    // Verify seeded businesses render in the list
    await expect(page.getByRole("link", { name: "Kopi & Toast Heritage" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Boon Tat Bookshop" })).toBeVisible();

    // Accessibility check on directory page
    await expectNoA11yViolations(page);
  });

  test("filters businesses dynamically by search query", async ({ page }) => {
    await page.goto("/listings");

    const searchInput = page.getByPlaceholder("Search name, category, or area…");
    await expect(searchInput).toBeVisible();

    // Type search term
    await searchInput.fill("Bookshop");

    // Wait for debounced search to update
    await expect(page.getByRole("link", { name: "Boon Tat Bookshop" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Kopi & Toast Heritage" })).not.toBeVisible();

    // Check URL query sync
    await expect(page).toHaveURL(/q=Bookshop/u);

    // Clear search
    await searchInput.fill("");
    await expect(page.getByRole("link", { name: "Kopi & Toast Heritage" })).toBeVisible();
  });

  test("filters businesses by category selection", async ({ page }) => {
    await page.goto("/listings");

    const categorySelect = page.getByLabel("Filter by category");
    await expect(categorySelect).toBeVisible();

    // Select "Retail"
    await categorySelect.selectOption("Retail");

    await expect(page.getByRole("link", { name: "Boon Tat Bookshop" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Kopi & Toast Heritage" })).not.toBeVisible();

    // Reset to "All categories"
    await categorySelect.selectOption("");
    await expect(page.getByRole("link", { name: "Kopi & Toast Heritage" })).toBeVisible();
  });

  test("toggles the open-now filter and syncs the URL query param", async ({ page }) => {
    await page.goto("/listings");

    const openNowSwitch = page.getByRole("switch", { name: "Open now" });
    await expect(openNowSwitch).toBeVisible();

    // Enable open-now filtering
    await openNowSwitch.click();
    await expect(page).toHaveURL(/openNow=true/u);
    await expect(openNowSwitch).toBeChecked();

    // Disable open-now filtering
    await openNowSwitch.click();
    await expect(page).not.toHaveURL(/openNow=true/u);
    await expect(openNowSwitch).not.toBeChecked();
  });

  test("shows empty state when no businesses match the search filter", async ({ page }) => {
    await page.goto("/listings");

    const searchInput = page.getByPlaceholder("Search name, category, or area…");
    await searchInput.fill("nonexistentqueryxyz12345");

    await expect(page.getByText("No businesses matched")).toBeVisible();
    await expect(page.getByText("Try a different search or clear the filters.")).toBeVisible();

    // Clear filters button restores listings
    const clearButton = page.getByRole("button", { name: "Clear filters" });
    await expect(clearButton).toBeVisible();
    await clearButton.click();

    await expect(page.getByRole("link", { name: "Kopi & Toast Heritage" })).toBeVisible();
  });

  test("navigates to listing detail page when clicking a business link", async ({ page }) => {
    await page.goto("/listings");

    await page.getByRole("link", { name: "Kopi & Toast Heritage" }).click();

    await expect(page).toHaveURL(new RegExp(`/listings/${SEEDED_LISTING_ID}`, "u"));
    await expect(
      page.getByRole("heading", { level: 1, name: "Kopi & Toast Heritage" })
    ).toBeVisible();
  });
});
