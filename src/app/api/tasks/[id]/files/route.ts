import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLog";
import { mkdir, writeFile } from "fs/promises";
import { createWriteStream } from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import path from "path";
import crypto from "crypto";
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  VIDEO_SIGNATURES,
  MAX_UPLOAD_BYTES,
  MAX_VIDEO_UPLOAD_BYTES,
} from "@/lib/constants";
import { getTaskReadAccess, hasPermission, isTaskOwner } from "@/lib/permissions";
import { TASK_FILES_ROOT } from "@/lib/storage";

// Documents allowed as task attachments alongside images/videos.
const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
];

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "video/x-msvideo": "avi",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/zip": "zip",
};

// Files live outside `public/` — never served by static path, always through
// the authenticated /api/files/[id] route below.
const STORAGE_ROOT = TASK_FILES_ROOT;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasPermission(session, "files", "create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: taskId } = await params;
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { assigneeId: true, creatorId: true },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { canReadAll } = getTaskReadAccess(session);
  if (!canReadAll && !isTaskOwner(session.user.id, task)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });

  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
  const allAllowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_DOCUMENT_TYPES];
  if (!allAllowed.includes(file.type)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  }

  const maxBytes = isVideo ? MAX_VIDEO_UPLOAD_BYTES : MAX_UPLOAD_BYTES;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `File exceeds the ${Math.round(maxBytes / (1024 * 1024))} MB limit` },
      { status: 400 }
    );
  }

  // The browser-supplied MIME type can be spoofed. For video specifically —
  // the format most likely to be abused to smuggle an executable — verify
  // the real file signature before trusting the declared type.
  if (isVideo) {
    const head = Buffer.from(await file.slice(0, 32).arrayBuffer());
    const matchesDeclaredType = VIDEO_SIGNATURES.some(
      (sig) => sig.type === file.type && sig.check(head)
    );
    if (!matchesDeclaredType) {
      return NextResponse.json({ error: "File content does not match a valid video format" }, { status: 400 });
    }
  }

  const fileId = crypto.randomUUID();
  const ext = MIME_EXT[file.type] ?? "bin";
  const taskDir = path.join(STORAGE_ROOT, taskId);
  await mkdir(taskDir, { recursive: true });
  const diskPath = path.join(taskDir, `${fileId}.${ext}`);

  try {
    if (file.stream) {
      await pipeline(Readable.fromWeb(file.stream() as never), createWriteStream(diskPath));
    } else {
      await writeFile(diskPath, Buffer.from(await file.arrayBuffer()));
    }
  } catch {
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
  }

  const originalName = (file.name || "upload").slice(0, 200);

  const created = await prisma.file.create({
    data: {
      name: originalName,
      url: `${taskId}/${fileId}.${ext}`,
      size: file.size,
      mimeType: file.type,
      taskId,
      uploadedBy: session.user.id,
    },
  });

  await logActivity({
    userId: session.user.id,
    action: "upload",
    entity: "file",
    entityId: created.id,
    metadata: { taskId, name: originalName, mimeType: file.type, size: file.size },
  });

  return NextResponse.json({ ...created, downloadUrl: `/api/files/${created.id}` }, { status: 201 });
}
