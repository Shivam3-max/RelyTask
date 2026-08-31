import { test, expect } from "@playwright/test";
import {
  ADMIN, STAFF, ADS_MANAGER, CUSTOM_CLIENTS_CREATOR, CUSTOM_ROLE_TEST_CLIENT_EMAIL, CLIENT_A,
} from "./fixtures";
import { loginStaff } from "./helpers";

// video_editor (STAFF) has no clients/ads/sops permissions at all. Before this
// suite existed, the sidebar showed Clients/Ad Tracker/SOP Builder to every
// signed-in user regardless of permission, and their underlying APIs enforced
// nothing (ads:create) or a hardcoded role-name allowlist instead of the
// permission the Roles UI actually grants (clients/projects/sops). These
// specs pin down that fix so it can't silently regress.
test.describe("Permission enforcement — menus and APIs match granted permissions", () => {
  test("sidebar hides Clients/Ad Tracker/SOP Builder from a role without those permissions", async ({ page }) => {
    await loginStaff(page, STAFF.email, STAFF.password);
    await page.goto("/dashboard");
    const nav = page.locator("aside nav[aria-label='Main navigation']");

    for (const hidden of ["Clients", "Ad Tracker", "SOP Builder", "Roles", "Capacity"]) {
      await expect(nav.getByText(hidden, { exact: true })).toHaveCount(0);
    }
    // Projects/Team/Tasks stay visible — shared lookup data other pages
    // (Tasks board, for every role) depend on; see Sidebar.tsx comment.
    for (const visible of ["Projects", "Team", "Tasks"]) {
      await expect(nav.getByText(visible, { exact: true })).toHaveCount(1);
    }
  });

  test("a role without clients:read/create gets 403 from the Clients API, not just a hidden menu", async ({ page }) => {
    await loginStaff(page, STAFF.email, STAFF.password);
    const getRes = await page.request.get("/api/clients");
    expect(getRes.status()).toBe(403);
    const postRes = await page.request.post("/api/clients", {
      data: { name: "Should be rejected", email: "rejected@example.com" },
    });
    expect(postRes.status()).toBe(403);
  });

  test("a role without sops:read/create gets 403 from the SOPs API", async ({ page }) => {
    await loginStaff(page, STAFF.email, STAFF.password);
    const getRes = await page.request.get("/api/sops");
    expect(getRes.status()).toBe(403);
    const postRes = await page.request.post("/api/sops", {
      data: { name: "Should be rejected", category: "OTHER", steps: [{ title: "step" }] },
    });
    expect(postRes.status()).toBe(403);
  });

  test("a role without ads:create is rejected; a role with it (ads_manager) succeeds", async ({ page, browser }) => {
    await loginStaff(page, STAFF.email, STAFF.password);
    const rejected = await page.request.post("/api/ads/metrics", {
      data: {
        date: new Date().toISOString(), spend: 10, impressions: 100, clicks: 5, conversions: 1,
        clientId: "does-not-matter", platform: "META",
      },
    });
    expect(rejected.status()).toBe(403);

    // ads_manager has ads:create but not clients:read — look the client id up
    // via an admin session instead of assuming ads_manager can list clients.
    // Pinned to CLIENT_A specifically (not "any client") so global-setup's
    // manual-AdAccount cleanup, which is scoped to CLIENT_A, actually matches
    // what this test creates.
    const adminPage = await (await browser.newContext()).newPage();
    await loginStaff(adminPage, ADMIN.email, ADMIN.password);
    const clients: { id: string; email: string }[] = await adminPage.request.get("/api/clients").then((r) => r.json());
    const clientA = clients.find((c) => c.email === CLIENT_A.email);
    expect(clientA, "CLIENT_A fixture should exist").toBeTruthy();
    await adminPage.context().close();

    const adsPage = await (await browser.newContext()).newPage();
    await loginStaff(adsPage, ADS_MANAGER.email, ADS_MANAGER.password);
    const accepted = await adsPage.request.post("/api/ads/metrics", {
      data: {
        date: new Date().toISOString(), spend: 10, impressions: 100, clicks: 5, conversions: 1,
        clientId: clientA!.id, platform: "META",
      },
    });
    expect(accepted.status()).toBe(201);
    await adsPage.context().close();
  });

  test("granting only clients:create (no clients:read) via the Roles system actually takes effect, per action", async ({ page }) => {
    await loginStaff(page, CUSTOM_CLIENTS_CREATOR.email, CUSTOM_CLIENTS_CREATOR.password);

    const createRes = await page.request.post("/api/clients", {
      data: { name: "E2E Permtest Client", email: CUSTOM_ROLE_TEST_CLIENT_EMAIL },
    });
    expect(createRes.status()).toBe(201);

    // Same role, no clients:read granted — the create permission doesn't
    // implicitly unlock read.
    const readRes = await page.request.get("/api/clients");
    expect(readRes.status()).toBe(403);
  });

  test("superadmin keeps full access across every module this suite touches", async ({ page }) => {
    await loginStaff(page, ADMIN.email, ADMIN.password);
    const [clients, sops, ads, roles] = await Promise.all([
      page.request.get("/api/clients"),
      page.request.get("/api/sops"),
      page.request.get("/api/ads/metrics"),
      page.request.get("/api/roles"),
    ]);
    for (const res of [clients, sops, ads, roles]) expect(res.status()).toBe(200);
  });
});
