import path from "path";

// Root for all user-uploaded files.
//
// On Hostinger (or any host that re-checks-out the app directory on each
// deploy) set STORAGE_DIR to an absolute path OUTSIDE the deployed app —
// e.g. /home/uXXXXXXXX/storage/relytask — so uploads survive redeploys and
// are captured by the daily account backup. Locally it falls back to the
// project directory.
const ROOT =
  process.env.STORAGE_DIR && process.env.STORAGE_DIR.trim()
    ? process.env.STORAGE_DIR.trim()
    : process.cwd();

// Task attachments — never served by a static path, always streamed through
// the authenticated /api/files/[id] route.
export const TASK_FILES_ROOT = path.join(ROOT, "storage", "task-files");

// Public images (avatars, client logos) — served through /api/uploads/[...path].
export const PUBLIC_UPLOADS_ROOT = path.join(ROOT, "public-uploads");
