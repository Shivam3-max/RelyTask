import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

const SopSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum([
    "VIDEO_EDITING", "CLIENT_VIDEO_RECORDING", "GRAPHIC_DESIGN", "ADS_MANAGEMENT", "SHOOT",
    "CONTENT_WRITING", "STRATEGY", "REPORTING", "OTHER",
  ]),
  steps: z.array(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
  })).min(1),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "sops", "read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sops = await prisma.sopTemplate.findMany({
    include: { steps: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(sops);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session, "sops", "create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = SopSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const { name, category, steps } = parsed.data;

  const sop = await prisma.sopTemplate.create({
    data: {
      name,
      category,
      steps: {
        create: steps.map((s, i) => ({
          title: s.title,
          description: s.description,
          order: i + 1,
        })),
      },
    },
    include: { steps: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json(sop, { status: 201 });
}
