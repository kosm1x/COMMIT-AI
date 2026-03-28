import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("login page renders with email and password fields", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test("shows sign up mode when toggled", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /sign up/i }).click();
    await expect(page.getByText(/create account/i)).toBeVisible();
  });

  test("shows password strength indicator during sign up", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /sign up/i }).click();
    await page.getByLabel(/password/i).fill("Test123!");
    // Strength indicator should appear with checks
    await expect(page.getByText(/8\+ characters/i)).toBeVisible();
  });

  test("shows error on invalid login", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/email/i).fill("invalid@test.com");
    await page.getByLabel(/password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();
    // Should show an error message (Supabase returns auth error)
    await expect(page.getByTestId("auth-error")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("shows forgot password form", async ({ page }) => {
    await page.goto("/");
    await page.getByText(/forgot password/i).click();
    await expect(page.getByText(/reset password/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /send reset link/i }),
    ).toBeVisible();
  });
});
