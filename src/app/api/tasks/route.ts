import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";
import { z } from "zod";
import { logActivity } from "@/lib/activityLog";
import { optionalCuid, optionalDateString } from "@/lib/validation";
import { getTaskReadAccess, hasPermission, ownTasksFilter } from "@/lib/permissions";

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional(),
  projectId: optionalCuid(),
  assigneeId: optionalCuid(),
  category: z.enum([
    "VIDEO_EDITING", "CLIENT_VIDEO_RECORDING", "GRAPHIC_DESIGN", "ADS_MANAGEMENT",
    "SHOOT", "CONTENT_WRITING", "STRATEGY", "REPORTING", "OTHER",
  ]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueDate: optionalDateString(),
  subtasks: z.array(z.string().min(1).max(200)).max(20).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { canReadAll, canReadOwn } = getTaskReadAccess(session);
  if (!canReadAll && !canReadOwn) return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const assigneeId = searchParams.get("assigneeId");
  const status = searchParams.get("status");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  // Combined via AND so a read_own user's ownership restriction can't be
  // widened by another filter (e.g. ?assigneeId=someone-else).
  const conditions: Record<string, unknown>[] = [];
  if (projectId) conditions.push({ projectId });
  if (assigneeId) conditions.push({ assigneeId });
  if (status) conditions.push({ status });
  if (startDate || endDate) {
    conditions.push({
      dueDate: {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      },
    });
  }
  if (!canReadAll) conditions.push(ownTasksFilter(session.user.id));

  const where: Record<string, unknown> = conditions.length ? { AND: conditions } : {};

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
  if (!hasPermission(session, "tasks", "create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { title, description, projectId, assigneeId, category, priority, dueDate, subtasks } = parsed.data;

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
        ? { create: subtasks.map((s) => ({ title: s })) }
        : undefined,
    },
    include: { assignee: true, project: true },
  });

  await logActivity({
    userId: session.user.id,
    action: "create",
    entity: "task",
    entityId: task.id,
    metadata: { title, assigneeId, projectId },
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
