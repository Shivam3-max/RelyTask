import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { subtaskId, done } = await req.json();
  const subtask = await prisma.subtask.update({
    where: { id: subtaskId, taskId: id },
    data: { done },
  });
  return NextResponse.json(subtask);
}
