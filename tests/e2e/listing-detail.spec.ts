import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Listing detail page", () => {
  test("serves not found page for nonexistent listing and passes axe", async ({ page }) => {
    const response = await page.goto("/listings/lst_non_existent");
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("heading", { level: 1, name: /page not found/iu })).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
