import { test, expect } from "@playwright/test";
import fs from "fs";
import os from "os";
import path from "path";
import { STAFF } from "./fixtures";
import { loginStaff } from "./helpers";

// Minimal valid MP4 header (ftyp box) — enough to pass the server's magic-byte check.
function writeFakeMp4(dir: string, name: string) {
  const buf = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypmp42"), Buffer.alloc(200)]);
  const file = path.join(dir, name);
  fs.writeFileSync(file, buf);
  return file;
}

function writeGarbageMp4(dir: string, name: string) {
  const file = path.join(dir, name);
  fs.writeFileSync(file, Buffer.from("not a real video file, just text pretending to be one"));
  return file;
}

test.describe("Task video attachments", () => {
  let tmpDir: string;

  test.beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "relytask-e2e-"));
  });

  test.afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("rejects a spoofed video, accepts a real one, downloads and deletes it", async ({ page }) => {
    await loginStaff(page, STAFF.email, STAFF.password);
    await page.goto("/tasks");

    // The seeded "review deliverable" task sits in the Client Approval column.
    const card = page.getByRole("button", { name: /review deliverable/ }).first();
    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const fileInput = dialog.locator('input[type="file"]');

    // 1. Spoofed video (.mp4 name, garbage bytes) must be rejected server-side.
    const garbage = writeGarbageMp4(tmpDir, "spoofed.mp4");
    await fileInput.setInputFiles(garbage);
    await expect(dialog.getByText(/does not match a valid video format/i)).toBeVisible({ timeout: 10_000 });
    await expect(dialog.getByText("spoofed.mp4")).toHaveCount(0);

    // 2. A real MP4 signature is accepted and listed.
    const real = writeFakeMp4(tmpDir, "real-clip.mp4");
    await fileInput.setInputFiles(real);
    const attachmentRow = dialog.getByText("real-clip.mp4");
    await expect(attachmentRow).toBeVisible({ timeout: 10_000 });

    // 3. Download goes through the authenticated /api/files/:id route.
    const [download] = await Promise.all([
      page.waitForEvent("popup"),
      dialog.getByRole("link", { name: /download real-clip.mp4/i }).click(),
    ]);
    await expect(download).toHaveURL(/\/api\/files\//);
    await download.close();

    // 4. Clean up — remove the attachment.
    await dialog.getByRole("button", { name: /remove real-clip.mp4/i }).click();
    await expect(attachmentRow).toHaveCount(0);
  });
});
