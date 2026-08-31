import { test, expect } from "@playwright/test";
import { ADMIN } from "./fixtures";
import { loginStaff } from "./helpers";

test.describe("Task board — critical CRUD flow", () => {
  test.beforeEach(async ({ page }) => {
    await loginStaff(page, ADMIN.email, ADMIN.password);
    await page.goto("/tasks");
  });

  test("create a Client Video Recording task, move it through statuses, then delete it", async ({ page }) => {
    const title = `E2E video recording task ${Date.now()}`;

    await page.getByRole("button", { name: "New Task" }).click();
    const createDialog = page.getByRole("dialog", { name: "Create Task" });
    await createDialog.getByPlaceholder("Task title").fill(title);
    // Labels aren't <select>-associated in this form — target the category
    // select by its known option values instead of an accessible name.
    const categorySelect = createDialog.locator("select").filter({
      has: page.locator('option[value="CLIENT_VIDEO_RECORDING"]'),
    });
    await categorySelect.selectOption("CLIENT_VIDEO_RECORDING");
    await createDialog.getByRole("button", { name: "Create Task", exact: true }).click();

    const card = page.getByRole("button", { name: new RegExp(title) });
    await expect(card).toBeVisible({ timeout: 10_000 });
    // exact:true — the task title itself contains "video recording" (lowercase),
    // which a substring match would also pick up alongside the category badge.
    await expect(card.getByText("Video Recording", { exact: true })).toBeVisible();

    // Open it and move it through the Jira-style status picker.
    await card.click();
    const dialog = page.getByRole("dialog", { name: title });
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: /To Do/ }).click();
    await dialog.getByRole("button", { name: "In Progress", exact: true }).click();
    await expect(dialog.getByRole("button", { name: /In Progress/ })).toBeVisible();

    // Delete it and confirm it's gone from the board.
    await dialog.getByRole("button", { name: "Delete task" }).click();
    await dialog.getByRole("button", { name: "Confirm delete task" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole("button", { name: new RegExp(title) })).toHaveCount(0);
  });
});
