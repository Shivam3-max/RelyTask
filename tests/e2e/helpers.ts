import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export async function login(page: Page, email: string, password: string, path = "/login") {
  await page.goto(path);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

// Timeouts here are generous — this dev server compiles routes on demand
// (Turbopack), so a route's first hit in a run can take several seconds.
export async function loginStaff(page: Page, email: string, password: string) {
  await login(page, email, password, "/login");
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
}

export async function loginClient(page: Page, email: string, password: string) {
  await login(page, email, password, "/portal/login");
  // Not just /\/portal/ — that also matches staying on /portal/login on a failed attempt.
  await expect(page).toHaveURL(/\/portal(\/(?!login).*)?$/, { timeout: 20_000 });
}
