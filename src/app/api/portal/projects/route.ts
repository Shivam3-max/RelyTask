import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find the client linked to this user
  const client = await prisma.client.findUnique({ where: { userId: session.user.id } });
  if (!client) return NextResponse.json([]);

  const projects = await prisma.project.findMany({
    where: { clientId: client.id },
    include: {
      tasks: {
        include: {
          assignee: { select: { name: true } },
          files: { select: { id: true, name: true, mimeType: true, size: true, createdAt: true } },
          _count: { select: { comments: true } },
        },
      },
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(projects);
}
