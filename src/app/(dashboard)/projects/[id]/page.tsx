import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ProjectDetail } from "./ProjectDetail";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const { id } = await params;

  const [project, users, sops] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        tasks: {
          include: {
            assignee: { select: { id: true, name: true } },
            _count: { select: { comments: true, files: true, subtasks: true } },
          },
          orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
        },
        _count: { select: { tasks: true } },
      },
    }),
    prisma.user.findMany({
      where: { isActive: true, role: { name: { not: "client" } } },
      select: { id: true, name: true, role: { select: { name: true } } },
    }),
    prisma.sopTemplate.findMany({
      include: { steps: { orderBy: { order: "asc" } } },
    }),
  ]);

  if (!project) notFound();

  return <ProjectDetail project={project as any} users={users} sops={sops as any} />;
}
