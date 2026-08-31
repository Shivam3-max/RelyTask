import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 100);
  if (!q || q.length < 2) return NextResponse.json({ tasks: [], projects: [], clients: [] });

  const isAdmin = (ADMIN_ROLES as readonly string[]).includes(session.user.role);

  const [tasks, projects, clients] = await Promise.all([
    prisma.task.findMany({
      where: {
        title: { contains: q },
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
          where: { name: { contains: q } },
          include: { client: { select: { name: true } } },
          take: 5,
        })
      : [],
    isAdmin
      ? prisma.client.findMany({
          where: {
            OR: [
              { name: { contains: q } },
              { companyName: { contains: q } },
            ],
          },
          take: 5,
        })
      : [],
  ]);

  return NextResponse.json({ tasks, projects, clients });
}
