import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { name, phone, roleId, isActive, password } = body;

  // Non-admins can only edit themselves
  const isAdmin = session.user.role === "master_admin";
  if (!isAdmin && id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (phone !== undefined) data.phone = phone;
  if (roleId !== undefined && isAdmin) data.roleId = roleId;
  if (isActive !== undefined && isAdmin) data.isActive = isActive;
  if (password) data.password = await bcrypt.hash(password, 12);

  const user = await prisma.user.update({
    where: { id },
    data,
    include: { role: true, _count: { select: { assignedTasks: true } } },
  });

  const { password: _, ...safe } = user as any;
  return NextResponse.json(safe);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      role: true,
      assignedTasks: {
        include: { project: { select: { name: true, client: { select: { name: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      _count: { select: { assignedTasks: true } },
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { password: _, ...safe } = user as any;
  return NextResponse.json(safe);
}
