import { NextRequest, NextResponse } from "next/server";
import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLog";
import { getTaskReadAccess, hasPermission, isTaskOwner } from "@/lib/permissions";
import { createReadStream } from "fs";
import { stat, unlink } from "fs/promises";
import { Readable } from "stream";
import path from "path";
import { TASK_FILES_ROOT } from "@/lib/storage";

const STORAGE_ROOT = TASK_FILES_ROOT;

async function loadAuthorizedFile(fileId: string, session: Session) {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    include: { task: { include: { project: true } } },
  });
  if (!file) return null;

  // Clients may only reach attachments on tasks under one of their own projects.
  if (session.user.role === "client") {
    const client = await prisma.client.findUnique({ where: { userId: session.user.id } });
    if (!client || file.task?.project?.clientId !== client.id) return null;
    return file;
  }

  // Everyone else needs the base files:read permission, and — unless they
  // hold tasks:read_all — must own the task this file is attached to. A
  // file with no task (none exist yet, but the model allows it) is only
  // visible to read_all holders, the conservative default.
  if (!hasPermission(session, "files", "read")) return null;
  const { canReadAll } = getTaskReadAccess(session);
  if (!canReadAll && !(file.task && isTaskOwner(session.user.id, file.task))) return null;

  return file;
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const file = await loadAuthorizedFile(id, session);
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // `url` is a storage-relative key like "<taskId>/<fileId>.<ext>" — never a
  // client-controlled path — so this stays inside STORAGE_ROOT.
  const diskPath = path.join(STORAGE_ROOT, file.url);
  if (!diskPath.startsWith(STORAGE_ROOT)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let size: number;
  try {
    size = (await stat(diskPath)).size;
  } catch {
    return NextResponse.json({ error: "File missing from storage" }, { status: 404 });
  }

  const safeName = file.name.replace(/[\r\n"]/g, "_");
  const stream = Readable.toWeb(createReadStream(diskPath)) as ReadableStream;

  return new NextResponse(stream, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(size),
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Cache-Control": "private, max-age=0, no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const file = await prisma.file.findUnique({ where: { id }, include: { task: true } });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { canReadAll } = getTaskReadAccess(session);
  const isUploader = file.uploadedBy === session.user.id;
  const ownsTask = file.task && isTaskOwner(session.user.id, file.task);
  if (!canReadAll && !isUploader && !ownsTask) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const diskPath = path.join(STORAGE_ROOT, file.url);
  await prisma.file.delete({ where: { id } });
  if (diskPath.startsWith(STORAGE_ROOT)) {
    await unlink(diskPath).catch(() => {});
  }

  await logActivity({
    userId: session.user.id,
    action: "delete",
    entity: "file",
    entityId: id,
    metadata: { taskId: file.taskId, name: file.name },
  });

  return NextResponse.json({ success: true });
}
