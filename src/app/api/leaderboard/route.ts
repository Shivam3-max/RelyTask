import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const users = await prisma.user.findMany({
    where: { isActive: true, role: { name: { not: "client" } } },
    select: {
      id: true,
      name: true,
      role: { select: { name: true } },
      assignedTasks: {
        select: {
          status: true,
          priority: true,
          completedAt: true,
          dueDate: true,
          subtasks: { select: { done: true } },
        },
      },
    },
  });

  const leaderboard = users.map((u) => {
    const total = u.assignedTasks.length;
    const done = u.assignedTasks.filter((t) => t.status === "DONE").length;
    const recentDone = u.assignedTasks.filter(
      (t) => t.status === "DONE" && t.completedAt && t.completedAt >= thirtyDaysAgo
    ).length;
    const onTime = u.assignedTasks.filter(
      (t) => t.status === "DONE" && t.dueDate && t.completedAt && t.completedAt <= t.dueDate
    ).length;
    const allSubtasks = u.assignedTasks.flatMap((t) => t.subtasks);
    const sopCompliance = allSubtasks.length
      ? Math.round((allSubtasks.filter((s) => s.done).length / allSubtasks.length) * 100)
      : 100;

    // Score: done tasks * 10 + urgent done * 5 + on-time bonus * 3
    const urgentDone = u.assignedTasks.filter(
      (t) => t.status === "DONE" && t.priority === "URGENT"
    ).length;
    const score = recentDone * 10 + urgentDone * 5 + onTime * 3;

    return {
      id: u.id,
      name: u.name,
      role: u.role.name,
      total,
      done,
      recentDone,
      onTime,
      sopCompliance,
      score,
    };
  });

  leaderboard.sort((a, b) => b.score - a.score);
  return NextResponse.json(leaderboard);
}
