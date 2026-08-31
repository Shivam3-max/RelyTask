import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import bcrypt from "bcryptjs";
import { z } from "zod";

const patchUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  avatar: z.string().max(500).optional().nullable(),
  roleId: z.string().cuid().optional().nullable(),
  isActive: z.boolean().optional(),
  currentPassword: z.string().optional(),
  password: z.string().min(8).max(100).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = patchUserSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { name, phone, roleId, isActive, password, avatar, currentPassword } = parsed.data;

  // Non-admins can only edit themselves
  const isAdmin = hasPermission(session, "team", "update");
  if (!isAdmin && id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (phone !== undefined) data.phone = phone;
  if (avatar !== undefined) data.avatar = avatar || null;
  if (roleId !== undefined && isAdmin) data.roleId = roleId;
  if (isActive !== undefined && isAdmin) data.isActive = isActive;
  if (password) {
    if (!isAdmin) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Current password is required." }, { status: 400 });
      }
      const existing = await prisma.user.findUnique({ where: { id }, select: { password: true } });
      if (!existing) return NextResponse.json({ error: "User not found." }, { status: 404 });
      const valid = await bcrypt.compare(currentPassword, existing.password);
      if (!valid) return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });
    }
    data.password = await bcrypt.hash(password, 12);
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    include: { role: true, _count: { select: { assignedTasks: true } } },
  });

  const { password: _pw, ...safe } = user;
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
  const { password: _pw, ...safe } = user;
  return NextResponse.json(safe);
}
