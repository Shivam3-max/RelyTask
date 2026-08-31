import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

const RoleSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
  permissions: z.array(z.object({
    module: z.string().min(1),
    action: z.string().min(1),
  })),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "roles", "read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const roles = await prisma.role.findMany({
    include: { permissions: true, _count: { select: { users: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(roles);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !hasPermission(session, "roles", "create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = RoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const { name, description, permissions } = parsed.data;

  const role = await prisma.role.create({
    data: {
      name,
      description,
      permissions: {
        connectOrCreate: permissions.map((p) => ({
          where: { id: `${p.module}:${p.action}` },
          create: { id: `${p.module}:${p.action}`, module: p.module, action: p.action },
        })),
      },
    },
    include: { permissions: true },
  });

  return NextResponse.json(role, { status: 201 });
}
