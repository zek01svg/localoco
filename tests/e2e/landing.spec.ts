import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("LocaLoco landing page", () => {
  test("serves the React landing page with meaningful content and passes axe", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    expect(response?.headers()["cache-control"]).toBe("no-store");

    await expect(page).toHaveTitle(/LocaLoco/iu);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Find local gems");
    await expect(page.getByRole("link", { name: "Let\u2019s go!" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Why LocaLoco?" })).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("fingerprinted assets are served immutable", async ({ page }) => {
    const html = await (await page.request.get("/")).text();
    const assetPaths = Array.from(html.matchAll(/(\/assets\/[^"']+\.js)/gu), match => match[1]);
    expect(assetPaths.length).toBeGreaterThan(0);

    const response = await page.request.get(assetPaths[0]);
    expect(response.ok()).toBeTruthy();
    expect(response.headers()["cache-control"]).toContain("immutable");
  });

  test("serves a not-found page with a keyboard-reachable recovery link", async ({ page }) => {
    const response = await page.goto("/nonexistent");
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("heading", { level: 1, name: /page not found/iu })).toBeVisible();
    const backHome = page.getByRole("link", { name: "Back to home" });
    await backHome.focus();
    await page.keyboard.press("Enter");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Find local gems");
  });

  test("exposes primary navigation links for discovery flows", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Why LocaLoco" })).toHaveAttribute("href", "#why");
    await expect(page.getByRole("link", { name: "How it works" })).toHaveAttribute("href", "#how");
    await expect(page.getByRole("link", { name: "Browse businesses" })).toHaveAttribute(
      "href",
      "/listings"
    );
    await expect(page.getByRole("link", { name: "Community forum" })).toHaveAttribute(
      "href",
      "/forum"
    );
  });
});
