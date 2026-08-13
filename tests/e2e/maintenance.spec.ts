import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Maintenance release landing page", () => {
  test("serves 503 with retry guidance and passes axe", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(503);
    expect(response?.headers()["retry-after"]).toBe("3600");

    await expect(page).toHaveTitle(/LocaLoco/iu);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("LocaLoco");

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
