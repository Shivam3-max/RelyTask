import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    include: { role: true, _count: { select: { assignedTasks: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users.map(({ password: _pw, ...u }) => u));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "master_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, email, password, phone, roleId } = await req.json();
  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, password: hashed, phone, roleId },
    include: { role: true },
  });

  const { password: _, ...safe } = user;
  return NextResponse.json(safe, { status: 201 });
}
