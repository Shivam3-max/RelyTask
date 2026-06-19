import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      projects: {
        include: {
          tasks: {
            include: { assignee: { select: { id: true, name: true } } },
            orderBy: { createdAt: "desc" },
          },
          _count: { select: { tasks: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      adAccounts: { include: { metrics: { orderBy: { date: "desc" }, take: 7 } } },
      _count: { select: { projects: true } },
    },
  });

  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(client);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const client = await prisma.client.update({
    where: { id },
    data: {
      name: body.name,
      companyName: body.companyName,
      email: body.email,
      phone: body.phone,
    },
  });
  return NextResponse.json(client);
}
