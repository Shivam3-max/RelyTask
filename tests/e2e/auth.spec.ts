import { test, expect } from "@playwright/test";
import { ADMIN } from "./fixtures";
import { login } from "./helpers";

test.describe("Authentication", () => {
  test("unauthenticated user is redirected away from the dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("wrong password shows an error and does not sign in", async ({ page }) => {
    await login(page, ADMIN.email, "not-the-password");
    await expect(page.getByText(/invalid/i)).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("valid credentials sign in and land on the dashboard", async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
    await expect(page.getByText(/good (morning|afternoon|evening)/i)).toBeVisible();
  });

  test("sign out returns to login and re-blocks protected routes", async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
