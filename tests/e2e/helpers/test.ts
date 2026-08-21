import type { Page } from "@playwright/test";

import { AxeBuilder } from "@axe-core/playwright";
import { expect, test as base } from "@playwright/test";

import { getRandomTestIp } from "./auth";

export const SEEDED_LISTING_ID = "00000000-0000-4000-c000-000000000001";
export const SEEDED_BOON_TAT_LISTING_ID = "00000000-0000-4000-c000-000000000002";
export const SEEDED_FORUM_POST_ID = "00000000-0000-4000-f000-000000000001";
export const SEEDED_NOT_FOUND_ID = "00000000-0000-4000-0000-000000000000";

export const test = base.extend<{ page: Page }>({
  page: async ({ page }, next) => {
    await page.setExtraHTTPHeaders({ "x-forwarded-for": getRandomTestIp() });
    await next(page);
  },
});

export async function expectNoA11yViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

export async function expectNotFound(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { level: 1, name: /page not found/iu })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to home" })).toBeVisible();
}
