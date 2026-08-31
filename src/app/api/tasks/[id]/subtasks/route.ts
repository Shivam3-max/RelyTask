import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getTaskReadAccess, hasPermission, isTaskOwner } from "@/lib/permissions";

const patchSchema = z.object({
  subtaskId: z.string().min(1),
  done: z.boolean(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "tasks", "update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Only the assignee, creator, or a read_all role can toggle subtasks
  const task = await prisma.task.findUnique({
    where: { id },
    select: { assigneeId: true, creatorId: true },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { canReadAll } = getTaskReadAccess(session);
  if (!canReadAll && !isTaskOwner(session.user.id, task)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const subtask = await prisma.subtask.update({
    where: { id: parsed.data.subtaskId, taskId: id },
    data: { done: parsed.data.done },
  });
  return NextResponse.json(subtask);
}
