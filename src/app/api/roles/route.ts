import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles = await prisma.role.findMany({
    include: { permissions: true, _count: { select: { users: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(roles);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "master_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, description, permissions } = await req.json();

  const role = await prisma.role.create({
    data: {
      name,
      description,
      permissions: {
        connectOrCreate: permissions.map((p: { module: string; action: string }) => ({
          where: { id: `${p.module}:${p.action}` },
          create: { id: `${p.module}:${p.action}`, module: p.module, action: p.action },
        })),
      },
    },
    include: { permissions: true },
  });

  return NextResponse.json(role, { status: 201 });
}
