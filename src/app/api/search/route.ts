import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ tasks: [], projects: [], clients: [] });

  const isAdmin = ["master_admin", "project_manager"].includes(session.user.role);

  const [tasks, projects, clients] = await Promise.all([
    prisma.task.findMany({
      where: {
        title: { contains: q, mode: "insensitive" },
        ...(isAdmin ? {} : { assigneeId: session.user.id }),
      },
      include: {
        project: { select: { name: true, client: { select: { name: true } } } },
        assignee: { select: { name: true } },
      },
      take: 5,
    }),
    isAdmin
      ? prisma.project.findMany({
          where: { name: { contains: q, mode: "insensitive" } },
          include: { client: { select: { name: true } } },
          take: 5,
        })
      : [],
    isAdmin
      ? prisma.client.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { companyName: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 5,
        })
      : [],
  ]);

  return NextResponse.json({ tasks, projects, clients });
}
