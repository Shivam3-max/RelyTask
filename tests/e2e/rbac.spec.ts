import { test, expect } from "@playwright/test";
import { ADMIN, STAFF, ADMIN_ONLY_TASK_TITLE } from "./fixtures";
import { loginStaff } from "./helpers";

// STAFF is seeded with the video_editor role: tasks:read_own + tasks:update
// only — no tasks:read_all, tasks:create, or tasks:delete. These specs prove
// that split is actually enforced, not just modeled in the Roles UI.
test.describe("Task RBAC — view own vs view all", () => {
  test("a read_own role sees its own tasks but not another user's", async ({ page }) => {
    await loginStaff(page, STAFF.email, STAFF.password);
    await page.goto("/tasks");

    await expect(page.getByRole("button", { name: /review deliverable/ }).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(ADMIN_ONLY_TASK_TITLE)).toHaveCount(0);
  });

  test("a read_all role sees every task, including ones it doesn't own", async ({ page }) => {
    await loginStaff(page, ADMIN.email, ADMIN.password);
    await page.goto("/tasks");

    await expect(page.getByText(ADMIN_ONLY_TASK_TITLE)).toBeVisible({ timeout: 20_000 });
  });

  test("a role without tasks:create cannot create a task, in the UI or via the API directly", async ({ page }) => {
    await loginStaff(page, STAFF.email, STAFF.password);
    await page.goto("/tasks");

    await expect(page.getByRole("button", { name: "New Task" })).toHaveCount(0);

    const res = await page.request.post("/api/tasks", {
      data: { title: "Should be rejected", category: "OTHER" },
    });
    expect(res.status()).toBe(403);
  });

  test("a role without tasks:delete cannot delete a task, even one it owns", async ({ page }) => {
    await loginStaff(page, STAFF.email, STAFF.password);

    const tasks: { id: string; title: string }[] = await page.request
      .get("/api/tasks")
      .then((r) => r.json());
    const ownTask = tasks.find((t) => t.title.includes("review deliverable"));
    expect(ownTask, "STAFF should have at least one own task from global-setup").toBeTruthy();

    await page.goto(`/tasks?task=${ownTask!.id}`);
    const dialog = page.getByRole("dialog", { name: ownTask!.title });
    await expect(dialog).toBeVisible({ timeout: 20_000 });
    await expect(dialog.getByRole("button", { name: "Delete task" })).toHaveCount(0);

    const res = await page.request.delete(`/api/tasks/${ownTask!.id}`);
    expect(res.status()).toBe(403);

    // Still there afterward — the rejected request didn't partially apply.
    const stillThere = await page.request.get(`/api/tasks/${ownTask!.id}`);
    expect(stillThere.status()).toBe(200);
  });

  test("a read_own role cannot fetch a task it doesn't own via the API (IDOR check)", async ({ page, browser }) => {
    const adminPage = await (await browser.newContext()).newPage();
    await loginStaff(adminPage, ADMIN.email, ADMIN.password);
    const adminTasks: { id: string; title: string }[] = await adminPage.request
      .get("/api/tasks")
      .then((r) => r.json());
    const adminOnlyTask = adminTasks.find((t) => t.title === ADMIN_ONLY_TASK_TITLE);
    expect(adminOnlyTask, "admin-only fixture task should exist").toBeTruthy();
    await adminPage.context().close();

    await loginStaff(page, STAFF.email, STAFF.password);
    const res = await page.request.get(`/api/tasks/${adminOnlyTask!.id}`);
    expect(res.status()).toBe(404);
  });
});
