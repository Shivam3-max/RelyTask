import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sops = await prisma.sopTemplate.findMany({
    include: { steps: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(sops);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, category, steps } = await req.json();

  const sop = await prisma.sopTemplate.create({
    data: {
      name,
      category,
      steps: {
        create: steps.map((s: { title: string; description?: string }, i: number) => ({
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
