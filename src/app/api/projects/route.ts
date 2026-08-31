import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { hasPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activityLog";
import { optionalDateString } from "@/lib/validation";

const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).optional(),
  clientId: z.string().min(1, "Client is required"),
  startDate: optionalDateString(),
  dueDate: optionalDateString(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await prisma.project.findMany({
    include: {
      client: { select: { name: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasPermission(session, "projects", "create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createProjectSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { name, description, clientId, startDate, dueDate } = parsed.data;

  const project = await prisma.project.create({
    data: {
      name,
      description,
      clientId,
      startDate: startDate ? new Date(startDate) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    },
    include: { client: true },
  });

  await logActivity({ userId: session.user.id, action: "create", entity: "project", entityId: project.id });

  return NextResponse.json(project, { status: 201 });
}
