import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true, avatar: true } },
      creator: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, client: { select: { name: true } } } },
      subtasks: { orderBy: { id: "asc" } },
      comments: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { comments: true, files: true, subtasks: true } },
    },
  });

  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(task);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { status, title, description, priority, assigneeId, dueDate, recurrence } = body;

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (status !== undefined) {
    data.status = status;
    if (status === "DONE") data.completedAt = new Date();
    else if (existing.status === "DONE") data.completedAt = null;
  }
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (priority !== undefined) data.priority = priority;
  if (assigneeId !== undefined) data.assigneeId = assigneeId || null;
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
  if (recurrence !== undefined) data.recurrence = recurrence;

  const task = await prisma.task.update({
    where: { id },
    data,
    include: {
      assignee: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, client: { select: { name: true } } } },
      subtasks: true,
      _count: { select: { comments: true, files: true, subtasks: true } },
    },
  });

  // Notify new assignee
  if (assigneeId && assigneeId !== existing.assigneeId && assigneeId !== session.user.id) {
    await sendNotification({
      userId: assigneeId,
      title: "Task assigned to you",
      body: `"${task.title}" has been assigned to you.`,
      type: "TASK_ASSIGNED",
      metadata: { taskId: task.id },
    });
  }

  // Notify creator when done
  if (status === "DONE" && existing.status !== "DONE" && existing.creatorId !== session.user.id) {
    await sendNotification({
      userId: existing.creatorId,
      title: "Task completed",
      body: `"${existing.title}" has been marked as done.`,
      type: "TASK_COMPLETED",
      metadata: { taskId: id },
    });
  }

  return NextResponse.json(task);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
