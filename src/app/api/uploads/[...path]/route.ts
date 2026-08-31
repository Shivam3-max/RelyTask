import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { Readable } from "stream";
import path from "path";
import { PUBLIC_UPLOADS_ROOT } from "@/lib/storage";

// Serves the public images written by /api/upload (avatars, client logos).
// They live outside `public/` — under STORAGE_DIR — so they persist across
// redeploys, which means they need an explicit route to be reachable.

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const diskPath = path.join(PUBLIC_UPLOADS_ROOT, ...segments);

  // Keep the resolved path inside PUBLIC_UPLOADS_ROOT — guards against `..`.
  if (
    diskPath !== PUBLIC_UPLOADS_ROOT &&
    !diskPath.startsWith(PUBLIC_UPLOADS_ROOT + path.sep)
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let size: number;
  try {
    const s = await stat(diskPath);
    if (!s.isFile()) throw new Error("not a file");
    size = s.size;
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const stream = Readable.toWeb(createReadStream(diskPath)) as ReadableStream;
  return new NextResponse(stream, {
    headers: {
      "Content-Type": MIME[path.extname(diskPath).toLowerCase()] ?? "application/octet-stream",
      "Content-Length": String(size),
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
