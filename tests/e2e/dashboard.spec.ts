import { test, expect } from "@playwright/test";
import { ADMIN, STAFF } from "./fixtures";
import { loginStaff } from "./helpers";

// The dashboard used to show every role the same org-wide widgets (team/client
// counts, a client list fetched but never rendered, an admin-only workload
// chart being the one exception). These specs pin the split: admins get the
// full org-wide view, other roles get a dashboard scoped to their own work.
test.describe("Dashboard — admins see more than regular users", () => {
  test("master_admin sees org-wide KPIs, Team Workload, and Recent Clients", async ({ page }) => {
    await loginStaff(page, ADMIN.email, ADMIN.password);
    await page.goto("/dashboard");
    // Scoped to the page content, not the sidebar — "Clients" etc. also
    // appear as nav links in both the desktop and mobile-drawer sidebars.
    const main = page.locator("#main-content");

    await expect(main.getByText("Total Tasks", { exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(main.getByText("Clients", { exact: true })).toBeVisible();
    await expect(main.getByText("Team Workload")).toBeVisible();
    await expect(main.getByText("Recent Clients")).toBeVisible();
    await expect(main.getByText("Coming Next — Agency Power Features")).toBeVisible();
  });

  test("a non-admin role (video_editor) gets a personal dashboard, not the org-wide one", async ({ page }) => {
    await loginStaff(page, STAFF.email, STAFF.password);
    await page.goto("/dashboard");
    const main = page.locator("#main-content");

    // Labels reflect personal scope, not org-wide framing.
    await expect(main.getByText("My Tasks", { exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(main.getByText("Total Tasks", { exact: true })).toHaveCount(0);

    // Org-wide-only widgets are absent entirely.
    await expect(main.getByText("Clients", { exact: true })).toHaveCount(0);
    await expect(main.getByText("Team Workload")).toHaveCount(0);
    await expect(main.getByText("Recent Clients")).toHaveCount(0);
    await expect(main.getByText("Coming Next — Agency Power Features")).toHaveCount(0);

    // Team Members count stays visible — the Team directory itself is open
    // to every role (see Sidebar.tsx), so hiding just the count here would
    // hide less than what /team already shows them.
    await expect(main.getByText("Team Members", { exact: true })).toBeVisible();
  });
});
