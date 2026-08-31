import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLog";
import { hasPermission } from "@/lib/permissions";

const patchClientSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  companyName: z.string().max(150).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  website: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  logo: z.string().nullable().optional(),
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "clients", "read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
      // accessToken is a live ad-platform credential — never select it into
      // an API response read by anyone with clients:read.
      adAccounts: {
        select: {
          id: true, platform: true, accountId: true, accountName: true, createdAt: true,
          metrics: { orderBy: { date: "desc" }, take: 7 },
        },
      },
      _count: { select: { projects: true } },
    },
  });

  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(client);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasPermission(session, "clients", "update")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = patchClientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const { logo, ...rest } = parsed.data;
  const client = await prisma.client.update({
    where: { id },
    data: {
      ...rest,
      ...(logo !== undefined ? { logo: logo || null } : {}),
    },
  });
  await logActivity({ userId: session.user.id, action: "update", entity: "client", entityId: id });
  return NextResponse.json(client);
}
