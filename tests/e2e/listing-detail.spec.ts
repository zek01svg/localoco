import { expect } from "@playwright/test";

import { createVerifiedUser } from "./helpers/auth";
import {
  expectNoA11yViolations,
  expectNotFound,
  SEEDED_BOON_TAT_LISTING_ID,
  SEEDED_LISTING_ID,
  test,
} from "./helpers/test";

test.describe("Listing Detail Page E2E", () => {
  test("renders full business details, contact info, hours schedule, and passes axe check", async ({
    page,
  }) => {
    await page.goto(`/listings/${SEEDED_LISTING_ID}`);

    // Business title & Category
    await expect(
      page.getByRole("heading", { level: 1, name: "Kopi & Toast Heritage" })
    ).toBeVisible();
    await expect(page.getByText("Food & Beverage").first()).toBeVisible();
    await expect(page.getByText("UEN: T20LL1001A")).toBeVisible();

    // Location & Contact details
    await expect(page.getByRole("heading", { level: 2, name: "Location & Address" })).toBeVisible();
    await expect(page.getByText("100 Orchard Road #02-15")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Contact & Online" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Call Kopi & Toast Heritage at +65 6555 0101" })
    ).toBeVisible();

    // Opening Hours schedule
    await expect(page.getByRole("heading", { level: 2, name: "Opening Hours" })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();

    // About section description
    await expect(page.getByRole("heading", { level: 2, name: "About" })).toBeVisible();
    await expect(
      page.getByText("Traditional Nanyang coffee roasted with butter and sugar")
    ).toBeVisible();

    // Accessibility check
    await expectNoA11yViolations(page);
  });

  test("renders announcements and events sections from seeded content", async ({ page }) => {
    // Kopi & Toast Heritage carries a seeded announcement
    await page.goto(`/listings/${SEEDED_LISTING_ID}`);
    await expect(
      page.getByRole("heading", { level: 2, name: "Announcements & Updates" })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Heritage Kaya Jar Batch Release" })).toBeVisible();

    // Boon Tat Bookshop carries a seeded upcoming event
    await page.goto(`/listings/${SEEDED_BOON_TAT_LISTING_ID}`);
    await expect(
      page.getByRole("heading", { level: 2, name: "Upcoming Events & Activities" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Local Authors Book Reading & Discussion" })
    ).toBeVisible();
  });

  test("verified member bookmarks a listing and sees it in their profile", async ({ page }) => {
    await createVerifiedUser(page);

    await page.goto(`/listings/${SEEDED_LISTING_ID}`);
    const bookmarkButton = page.getByRole("button", { name: "Save bookmark" });
    await expect(bookmarkButton).toBeVisible();
    await bookmarkButton.click();

    // Bookmark state flips
    await expect(page.getByRole("button", { name: "Remove bookmark" })).toBeVisible({
      timeout: 10_000,
    });

    // Saved bookmarks section on the profile shows the listing
    await page.goto("/profile");
    await expect(page.getByRole("heading", { level: 2, name: "Saved bookmarks" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Kopi & Toast Heritage" })).toBeVisible();
  });

  test("navigates back to discovery directory via breadcrumb", async ({ page }) => {
    await page.goto(`/listings/${SEEDED_LISTING_ID}`);

    const backLink = page.getByRole("link", { name: /back to discovery directory/iu });
    await expect(backLink).toBeVisible();
    await backLink.click();

    await expect(page).toHaveURL(/\/listings$/u);
    await expect(
      page.getByRole("heading", { level: 1, name: "Discover local businesses" })
    ).toBeVisible();
  });

  test("renders not-found page when navigating to a non-existent listing ID", async ({ page }) => {
    await page.goto("/listings/00000000-0000-4000-0000-000000000000");

    await expectNotFound(page);
  });
});
