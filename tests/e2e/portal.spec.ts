import { test, expect } from "@playwright/test";
import fs from "fs";
import os from "os";
import path from "path";
import {
  STAFF, CLIENT_A, CLIENT_B, NOT_AWAITING_APPROVAL_TASK_TITLE, REVISION_LIMIT_REACHED_TASK_TITLE,
} from "./fixtures";
import { login, loginStaff, loginClient } from "./helpers";

test.describe("Client portal", () => {
  test("unauthenticated visitor is redirected off the portal", async ({ page }) => {
    await page.goto("/portal/approvals");
    await expect(page).toHaveURL(/\/portal\/login/, { timeout: 20_000 });
  });

  test("client can approve a pending deliverable", async ({ page }) => {
    await loginClient(page, CLIENT_A.email, CLIENT_A.password);
    await page.goto("/portal/approvals");

    const card = page.getByText(/review deliverable/).first();
    await expect(card).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: "Approve" }).first().click();
    await page.getByRole("button", { name: "Confirm Approval" }).click();

    await expect(page.getByText(/deliverable approved/i)).toBeVisible({ timeout: 20_000 });
  });

  test("a client cannot download another client's task attachment", async ({ browser }) => {
    // Staff uploads a file to Client B's task.
    const staffPage = await (await browser.newContext()).newPage();
    await loginStaff(staffPage, STAFF.email, STAFF.password);
    await staffPage.goto("/tasks");
    // Match by project name, not position — column order shifts once the
    // "client can approve" test above moves Client A's task to Done.
    const bTaskCard = staffPage.getByRole("button", { name: /Client B.*review deliverable/ });
    await expect(bTaskCard).toBeVisible({ timeout: 20_000 });
    await bTaskCard.click();
    const dialog = staffPage.getByRole("dialog");

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "relytask-e2e-isolation-"));
    const video = path.join(tmpDir, "client-b-only.mp4");
    fs.writeFileSync(video, Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypmp42"), Buffer.alloc(100)]));
    await dialog.locator('input[type="file"]').setInputFiles(video);
    await expect(dialog.getByText("client-b-only.mp4")).toBeVisible({ timeout: 10_000 });

    const downloadHref = await dialog.getByRole("link", { name: /download client-b-only.mp4/i }).getAttribute("href");
    expect(downloadHref).toMatch(/^\/api\/files\//);

    // Client A, authenticated in a separate context, must not be able to fetch it.
    const clientAContext = await browser.newContext();
    const clientAPage = await clientAContext.newPage();
    await login(clientAPage, CLIENT_A.email, CLIENT_A.password, "/portal/login");
    await expect(clientAPage).toHaveURL(/\/portal(\/(?!login).*)?$/, { timeout: 20_000 });

    const forbidden = await clientAPage.request.get(downloadHref!);
    expect(forbidden.status()).toBe(404);

    // Client B, the rightful owner, can.
    const clientBContext = await browser.newContext();
    const clientBPage = await clientBContext.newPage();
    await login(clientBPage, CLIENT_B.email, CLIENT_B.password, "/portal/login");
    await expect(clientBPage).toHaveURL(/\/portal(\/(?!login).*)?$/, { timeout: 20_000 });

    const allowed = await clientBPage.request.get(downloadHref!);
    expect(allowed.status()).toBe(200);

    // Clean up the attachment created for this test.
    await dialog.getByRole("button", { name: /remove client-b-only.mp4/i }).click();
    await expect(dialog.getByText("client-b-only.mp4")).toHaveCount(0);

    fs.rmSync(tmpDir, { recursive: true, force: true });
    await clientAContext.close();
    await clientBContext.close();
    await staffPage.context().close();
  });

  test("a client cannot approve or request revision on a task that isn't awaiting approval", async ({ page }) => {
    await login(page, CLIENT_B.email, CLIENT_B.password, "/portal/login");
    await expect(page).toHaveURL(/\/portal(\/(?!login).*)?$/, { timeout: 20_000 });

    type PortalTask = { id: string; title: string };
    const projects: { tasks: PortalTask[] }[] = await page.request.get("/api/portal/projects").then((r) => r.json());
    const task = projects.flatMap((p) => p.tasks).find((t) => t.title === NOT_AWAITING_APPROVAL_TASK_TITLE);
    expect(task, "fixture task should exist").toBeTruthy();

    const approveRes = await page.request.patch("/api/portal/tasks", {
      data: { taskId: task!.id, action: "approve" },
    });
    expect(approveRes.status()).toBe(409);

    const revisionRes = await page.request.patch("/api/portal/tasks", {
      data: { taskId: task!.id, action: "revision", feedback: "please change this" },
    });
    expect(revisionRes.status()).toBe(409);
  });

  test("a client cannot request revision once the revision limit is reached", async ({ page }) => {
    await login(page, CLIENT_B.email, CLIENT_B.password, "/portal/login");
    await expect(page).toHaveURL(/\/portal(\/(?!login).*)?$/, { timeout: 20_000 });

    type PortalTask = { id: string; title: string };
    const projects: { tasks: PortalTask[] }[] = await page.request.get("/api/portal/projects").then((r) => r.json());
    const task = projects.flatMap((p) => p.tasks).find((t) => t.title === REVISION_LIMIT_REACHED_TASK_TITLE);
    expect(task, "fixture task should exist").toBeTruthy();

    const res = await page.request.patch("/api/portal/tasks", {
      data: { taskId: task!.id, action: "revision", feedback: "one more please" },
    });
    expect(res.status()).toBe(409);

    // The UI should never have offered the button in the first place.
    await page.goto("/portal/approvals");
    await expect(page.getByText(REVISION_LIMIT_REACHED_TASK_TITLE)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Revision limit reached — contact your agency directly")).toBeVisible();
  });
});
