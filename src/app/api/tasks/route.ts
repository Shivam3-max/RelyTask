import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const assigneeId = searchParams.get("assigneeId");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (projectId) where.projectId = projectId;
  if (assigneeId) where.assigneeId = assigneeId;
  if (status) where.status = status;

  // Non-admins only see their own tasks
  if (!["master_admin", "project_manager"].includes(session.user.role)) {
    where.assigneeId = session.user.id;
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      assignee: { select: { id: true, name: true, avatar: true } },
      project: { select: { id: true, name: true, client: { select: { name: true } } } },
      _count: { select: { comments: true, files: true, subtasks: true } },
    },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, projectId, assigneeId, category, priority, dueDate, subtasks } = body;

  const task = await prisma.task.create({
    data: {
      title,
      description,
      projectId,
      assigneeId,
      category,
      priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      creatorId: session.user.id,
      subtasks: subtasks?.length
        ? { create: subtasks.map((s: string) => ({ title: s })) }
        : undefined,
    },
    include: { assignee: true, project: true },
  });

  if (assigneeId && assigneeId !== session.user.id) {
    await sendNotification({
      userId: assigneeId,
      title: "New task assigned to you",
      body: `"${title}" has been assigned to you${dueDate ? ` — due ${new Date(dueDate).toDateString()}` : ""}.`,
      type: "TASK_ASSIGNED",
      metadata: { taskId: task.id },
    });
  }

  return NextResponse.json(task, { status: 201 });
}
