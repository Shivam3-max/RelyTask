import type { Metadata } from "next";
import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "./DashboardClient";
import { ADMIN_ROLES } from "@/lib/constants";
import { getTaskReadAccess, ownTasksFilter, hasPermission } from "@/lib/permissions";

export const metadata: Metadata = { title: "Dashboard" };

async function getDashboardData(session: Session) {
  const userId = session.user.id;
  const isAdmin = (ADMIN_ROLES as readonly string[]).includes(session.user.role);
  const { canReadAll } = getTaskReadAccess(session);
  const taskWhere = canReadAll ? {} : ownTasksFilter(userId);
  // Client count is an org-wide business metric — only show it to roles that
  // can actually read the Clients module (matches /api/clients' own gate).
  // Team count stays ungated: the Team page/directory is intentionally open
  // to every signed-in role (see Sidebar.tsx), so hiding just the number here
  // would hide less than what's already visible on /team.
  const canSeeClients = hasPermission(session, "clients", "read");

  const now = new Date();
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(now.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [
    totalTasks, doneTasks, overdueTasks, activeProjects,
    teamCount, clientCount, recentTasks, allTasks, users, clients,
  ] = await Promise.all([
    prisma.task.count({ where: taskWhere }),
    prisma.task.count({ where: { ...taskWhere, status: "DONE" } }),
    prisma.task.count({ where: { ...taskWhere, dueDate: { lt: now }, status: { not: "DONE" } } }),
    // Admins get the org-wide active-project total; everyone else gets the
    // count scoped to projects they actually have a task in — an unscoped
    // number here would leak the org's total project volume to a role with
    // no projects:read permission at all.
    isAdmin
      ? prisma.project.count({ where: { status: "ACTIVE" } })
      : prisma.project.count({ where: { status: "ACTIVE", tasks: { some: taskWhere } } }),
    prisma.user.count({ where: { isActive: true } }),
    canSeeClients ? prisma.client.count() : Promise.resolve(null),
    prisma.task.findMany({
      where: taskWhere,
      include: {
        assignee: { select: { id: true, name: true } },
        project: { select: { name: true, client: { select: { name: true } } } },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.task.findMany({
      where: taskWhere,
      select: { status: true, category: true, priority: true, completedAt: true, createdAt: true },
    }),
    isAdmin ? prisma.user.findMany({
      where: { isActive: true },
      include: { _count: { select: { assignedTasks: true } }, role: true },
      take: 6,
    }) : Promise.resolve([]),
    isAdmin ? prisma.client.findMany({
      include: { projects: { select: { status: true } } },
      take: 5,
      orderBy: { createdAt: "desc" },
    }) : Promise.resolve([]),
  ]);

  // Tasks completed per day last 7 days
  const completionTrend = last7.map((day) => {
    const next = new Date(day);
    next.setDate(day.getDate() + 1);
    return {
      day: day.toLocaleDateString("en-IN", { weekday: "short" }),
      completed: allTasks.filter(
        (t) => t.completedAt && t.completedAt >= day && t.completedAt < next
      ).length,
      created: allTasks.filter(
        (t) => t.createdAt >= day && t.createdAt < next
      ).length,
    };
  });

  // Status breakdown
  const statusBreakdown = [
    { name: "Done", value: allTasks.filter(t => t.status === "DONE").length, color: "#22c55e" },
    { name: "In Progress", value: allTasks.filter(t => t.status === "IN_PROGRESS").length, color: "#3b82f6" },
    { name: "In Review", value: allTasks.filter(t => t.status === "IN_REVIEW").length, color: "#eab308" },
    { name: "Approval", value: allTasks.filter(t => t.status === "CLIENT_APPROVAL").length, color: "#a855f7" },
    { name: "Revision", value: allTasks.filter(t => t.status === "REVISION").length, color: "#f97316" },
    { name: "To Do", value: allTasks.filter(t => t.status === "TODO").length, color: "#6b7280" },
  ].filter(s => s.value > 0);

  // Category breakdown
  const categoryMap: Record<string, number> = {};
  allTasks.forEach(t => { categoryMap[t.category] = (categoryMap[t.category] || 0) + 1; });
  const categoryBreakdown = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

  type UserWithWorkload = { name: string; _count: { assignedTasks: number }; role: { name: string } };
  const teamWorkload = (users as UserWithWorkload[]).map((u) => ({
    name: u.name.split(" ")[0],
    tasks: u._count.assignedTasks,
    role: u.role.name.replace(/_/g, " "),
  }));

  return {
    stats: { totalTasks, doneTasks, overdueTasks, activeProjects, teamCount, clientCount },
    completionTrend,
    statusBreakdown,
    categoryBreakdown,
    teamWorkload,
    recentTasks: recentTasks.map((t) => ({
      ...t,
      dueDate: t.dueDate?.toISOString() ?? null,
      updatedAt: t.updatedAt.toISOString(),
      createdAt: t.createdAt.toISOString(),
      completedAt: t.completedAt?.toISOString() ?? null,
    })),
    clients,
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const data = await getDashboardData(session);
  return <DashboardClient data={data} user={{ name: session.user.name, role: session.user.role }} />;
}
