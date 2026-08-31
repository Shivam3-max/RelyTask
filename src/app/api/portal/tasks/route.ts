import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";

const PatchSchema = z.object({
  taskId: z.string().min(1),
  action: z.enum(["approve", "revision"]),
  feedback: z.string().max(2000).optional(),
});

// Client approves or requests revision on a task
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const { taskId, action, feedback } = parsed.data;

  const client = await prisma.client.findUnique({ where: { userId: session.user.id } });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  // Verify task belongs to this client's project
  const task = await prisma.task.findFirst({
    where: { id: taskId, project: { clientId: client.id } },
    include: { assignee: true, creator: true },
  });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  // Approve/revision only make sense while the task is actually awaiting the
  // client — without this, the endpoint let a client force any of their own
  // tasks straight to DONE (or back to REVISION) from any status.
  if (task.status !== "CLIENT_APPROVAL") {
    return NextResponse.json({ error: "This task isn't awaiting your approval" }, { status: 409 });
  }
  if (action === "revision" && task.revisionNo >= task.maxRevisions) {
    return NextResponse.json({ error: "Revision limit reached — contact your agency directly" }, { status: 409 });
  }

  if (action === "approve") {
    await prisma.task.update({
      where: { id: taskId },
      data: { status: "DONE", completedAt: new Date() },
    });

    // Add approval comment
    if (feedback) {
      await prisma.comment.create({
        data: {
          body: `Client approved: ${feedback}`,
          taskId,
          authorId: session.user.id,
        },
      });
    }

    // Notify creator
    if (task.creatorId) {
      await sendNotification({
        userId: task.creatorId,
        title: "Client approved a deliverable",
        body: `"${task.title}" was approved by ${session.user.name}`,
        type: "CLIENT_APPROVED",
        metadata: { taskId },
      });
    }
  } else if (action === "revision") {
    await prisma.task.update({
      where: { id: taskId },
      data: { status: "REVISION", revisionNo: { increment: 1 } },
    });

    if (feedback) {
      await prisma.comment.create({
        data: {
          body: `Revision requested: ${feedback}`,
          taskId,
          authorId: session.user.id,
        },
      });
    }

    if (task.assigneeId) {
      await sendNotification({
        userId: task.assigneeId,
        title: "Revision requested",
        body: `Client requested a revision on "${task.title}": ${feedback}`,
        type: "REVISION_REQUESTED",
        metadata: { taskId },
      });
    }
  }

  return NextResponse.json({ success: true });
}
