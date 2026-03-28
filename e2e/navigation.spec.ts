import { test, expect } from "@playwright/test";

test.describe("Navigation (unauthenticated)", () => {
  test("redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/journal");
    // Should show login page (no session)
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test("login page has COMMIT branding", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByAltText("COMMIT")).toBeVisible();
  });

  test("app loads without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/");
    await page.waitForTimeout(2000);
    // Filter out expected errors (Supabase connection without config is ok)
    const unexpected = errors.filter(
      (e) =>
        !e.includes("supabase") &&
        !e.includes("Failed to fetch") &&
        !e.includes("placeholder"),
    );
    expect(unexpected).toHaveLength(0);
  });
});
