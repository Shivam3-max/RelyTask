import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logActivity } from "@/lib/activityLog";
import { hasPermission } from "@/lib/permissions";

const createClientSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  companyName: z.string().max(150).optional(),
  email: z.string().email("Invalid email"),
  phone: z.string().max(20).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "clients", "read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clients = await prisma.client.findMany({
    include: {
      _count: { select: { projects: true } },
      projects: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasPermission(session, "clients", "create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createClientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const client = await prisma.client.create({ data: parsed.data });
  await logActivity({ userId: session.user.id, action: "create", entity: "client", entityId: client.id });
  return NextResponse.json(client, { status: 201 });
}
