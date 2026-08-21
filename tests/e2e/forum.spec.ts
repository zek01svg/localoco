import { expect } from "@playwright/test";

import { expectNoA11yViolations, expectNotFound, SEEDED_FORUM_POST_ID, test } from "./helpers/test";

test.describe("Community Forum Flows E2E", () => {
  test("browses forum feed with seeded discussions and passes accessibility check", async ({
    page,
  }) => {
    await page.goto("/forum");

    await expect(page.getByRole("heading", { level: 1, name: "Community forum" })).toBeVisible();

    // Verify seeded post card is displayed
    const postTitle = page.getByRole("link", {
      name: "Guide to ordering traditional Nanyang kopi customizations?",
    });
    await expect(postTitle).toBeVisible();
    await expect(page.getByText("Kopi & Toast Heritage").first()).toBeVisible();

    // Accessibility check
    await expectNoA11yViolations(page);
  });

  test("prompts unauthenticated visitors to sign in before interacting", async ({ page }) => {
    // Feed header shows the sign-in prompt for guests
    await page.goto("/forum");
    await expect(page.getByText("Sign in to start a discussion").first()).toBeVisible();

    // Thread page shows the sign-in prompt in place of the reply composer
    await page.goto(`/forum/${SEEDED_FORUM_POST_ID}`);
    await expect(page.getByRole("link", { name: "Sign in to join the discussion." })).toBeVisible();

    // The prompt links to the login page
    await page.getByRole("link", { name: "Sign in to join the discussion." }).click();
    await expect(page).toHaveURL(/\/login/u, { timeout: 10_000 });
  });

  test("opens forum thread details and displays replies list", async ({ page }) => {
    await page.goto(`/forum/${SEEDED_FORUM_POST_ID}`);

    // Thread title & body
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Guide to ordering traditional Nanyang kopi customizations?",
      })
    ).toBeVisible();
    await expect(page.getByText("Can anyone share the local terminology")).toBeVisible();

    // Replies list
    await expect(
      page.getByText("Kopi-O is black with sugar, Kopi-C is with evaporated milk")
    ).toBeVisible();
    await expect(page.getByText("And if you want iced, just add 'Peng'")).toBeVisible();

    // Accessibility check on post detail
    await expectNoA11yViolations(page);
  });

  test("navigates from forum feed into post thread and back", async ({ page }) => {
    await page.goto("/forum");

    // Click on post link
    await page
      .getByRole("link", {
        name: "Guide to ordering traditional Nanyang kopi customizations?",
      })
      .click();

    await expect(page).toHaveURL(new RegExp(`/forum/${SEEDED_FORUM_POST_ID}`, "u"));

    // Navigate back to forum feed
    const backLink = page.getByRole("link", { name: /back to forum/iu });
    await expect(backLink).toBeVisible();
    await backLink.click();

    await expect(page).toHaveURL(/\/forum$/u);
    await expect(page.getByRole("heading", { level: 1, name: "Community forum" })).toBeVisible();
  });

  test("renders not-found page for non-existent forum post", async ({ page }) => {
    await page.goto("/forum/00000000-0000-4000-0000-000000000000");

    await expectNotFound(page);
  });
});
