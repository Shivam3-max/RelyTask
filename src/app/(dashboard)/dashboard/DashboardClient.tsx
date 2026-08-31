"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, CartesianGrid,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  CheckSquare, AlertTriangle, FolderOpen, Users,
  UserCircle, TrendingUp, ArrowRight,
} from "lucide-react";
import { formatDate, isOverdue } from "@/lib/utils";
import { ADMIN_ROLES, CATEGORY_LABEL, PRIORITY_DOT } from "@/lib/constants";
import { Badge } from "@/components/ui/Badge";

const STATUS_TONE: Record<string, "neutral" | "info" | "warning" | "accent" | "success"> = {
  TODO: "neutral",
  IN_PROGRESS: "info",
  IN_REVIEW: "warning",
  CLIENT_APPROVAL: "accent",
  REVISION: "warning",
  DONE: "success",
};

// Chart theme — kept in one place so every surface reads as one system.
const CHART = {
  accent: "#6b78f5",
  positive: "#3ecf7e",
  axis: "#6b6b73",
  grid: "#1f1f23",
  tooltip: { background: "#141417", border: "1px solid #232328", borderRadius: 10, fontSize: 12, padding: "8px 10px", color: "#ededf0" },
  tooltipLabel: { color: "#8b8b96", marginBottom: 2 },
  series: ["#6b78f5", "#8f9cff", "#b78bff", "#5fa8ff", "#3fd8c8", "#3ecf7e"],
};

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

// Renders nothing until mounted so server/client markup can't disagree on the
// current minute; then shows the local date + 12-hour time, refreshed each
// half-minute.
function LiveDateTime() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!now) return null;
  return (
    <div className="hidden sm:flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900 px-3 py-1.5 text-xs text-gray-400 tabular-nums">
      <span>{now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</span>
      <span className="h-3 w-px bg-gray-800" />
      <span className="text-gray-300">
        {now.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}
      </span>
    </div>
  );
}

type RecentTask = {
  id: string;
  title: string;
  status: string;
  category: string;
  priority: string;
  dueDate?: string | null;
  updatedAt: string;
  assignee?: { id: string; name: string } | null;
  project?: { name: string; client: { name: string } } | null;
};

type ClientSummary = {
  id: string;
  name: string;
  projects: { status: string }[];
};

type CapacityDatum = {
  name: string; role: string;
  overdue: number; thisWeek: number; later: number; total: number; load: string;
};

type Props = {
  data: {
    stats: { totalTasks: number; doneTasks: number; overdueTasks: number; activeProjects: number; teamCount: number; clientCount: number | null };
    completionTrend: { day: string; completed: number; created: number }[];
    statusBreakdown: { name: string; value: number; color: string }[];
    categoryBreakdown: { name: string; value: number }[];
    teamCapacity: CapacityDatum[];
    recentTasks: RecentTask[];
    clients: ClientSummary[];
  };
  user: { name: string; role: string };
};

export function DashboardClient({ data, user }: Props) {
  const { stats, completionTrend, statusBreakdown, categoryBreakdown, teamCapacity, recentTasks, clients } = data;
  const completion = stats.totalTasks ? Math.round((stats.doneTasks / stats.totalTasks) * 100) : 0;
  const isAdmin = (ADMIN_ROLES as readonly string[]).includes(user.role);

  const kpis = [
    { label: isAdmin ? "Total tasks" : "My tasks", value: stats.totalTasks, sub: `${completion}% done`, Icon: CheckSquare },
    { label: isAdmin ? "Overdue" : "My overdue", value: stats.overdueTasks, sub: "Need action", Icon: AlertTriangle, danger: stats.overdueTasks > 0 },
    { label: isAdmin ? "Active projects" : "My active projects", value: stats.activeProjects, sub: isAdmin ? "Running now" : "You have tasks in", Icon: FolderOpen },
    { label: "Team members", value: stats.teamCount, sub: "Active", Icon: Users },
    ...(stats.clientCount !== null
      ? [{ label: "Clients", value: stats.clientCount, sub: "Total", Icon: UserCircle }]
      : []),
    { label: isAdmin ? "Completed" : "My completed", value: stats.doneTasks, sub: "All time", Icon: TrendingUp },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-white">
            Good {getTimeOfDay()}, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-gray-500">Here&apos;s what&apos;s moving across your organization.</p>
        </div>
        <LiveDateTime />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Performance */}
      <SectionCard>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Organization performance</h3>
            <p className="mt-0.5 text-xs text-gray-500">Completed vs. remaining, all tasks</p>
          </div>
          <span className="text-2xl font-semibold tabular-nums text-white">{completion}%</span>
        </div>
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-indigo-500 transition-[width] duration-700 ease-out"
            style={{ width: `${completion}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-500">
          <span><span className="text-gray-300">{stats.doneTasks}</span> completed</span>
          <span><span className="text-gray-300">{stats.totalTasks - stats.doneTasks}</span> remaining</span>
          {stats.overdueTasks > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              {stats.overdueTasks} overdue
            </span>
          )}
        </div>
      </SectionCard>

      {/* Activity + status */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard className="lg:col-span-2">
          <CardHead title="Task activity" sub="Created vs. completed — last 7 days" />
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={completionTrend} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="gCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.accent} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={CHART.accent} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.positive} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={CHART.positive} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="day" tick={{ fill: CHART.axis, fontSize: 11 }} axisLine={false} tickLine={false} dy={4} />
              <YAxis tick={{ fill: CHART.axis, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={40} />
              <Tooltip contentStyle={CHART.tooltip} labelStyle={CHART.tooltipLabel} cursor={{ stroke: CHART.grid }} />
              <Area type="monotone" dataKey="completed" name="Completed" stroke={CHART.accent} strokeWidth={2} fill="url(#gCompleted)" dot={false} activeDot={{ r: 3 }} />
              <Area type="monotone" dataKey="created" name="Created" stroke={CHART.positive} strokeWidth={2} fill="url(#gCreated)" dot={false} activeDot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard>
          <CardHead title="Task status" sub="Current breakdown" />
          {statusBreakdown.length === 0 ? (
            <EmptyChart label="No tasks yet" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={42} outerRadius={64} dataKey="value" paddingAngle={2} strokeWidth={0}>
                    {statusBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART.tooltip} labelStyle={CHART.tooltipLabel} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5">
                {statusBreakdown.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-gray-400">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                      {s.name}
                    </span>
                    <span className="font-medium tabular-nums text-gray-200">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </SectionCard>
      </div>

      {/* Category + workload */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard>
          <CardHead title="Work by category" sub="Volume per service type" />
          {categoryBreakdown.length === 0 ? (
            <EmptyChart label="No tasks yet" />
          ) : (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart
                data={categoryBreakdown.map((c) => ({ ...c, name: CATEGORY_LABEL[c.name] ?? c.name }))}
                margin={{ top: 4, right: 4, left: -22, bottom: 0 }}
              >
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: CHART.axis, fontSize: 10 }} axisLine={false} tickLine={false} dy={4} interval={0} />
                <YAxis tick={{ fill: CHART.axis, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={40} />
                <Tooltip contentStyle={CHART.tooltip} labelStyle={CHART.tooltipLabel} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="value" name="Tasks" radius={[5, 5, 0, 0]} maxBarSize={38}>
                  {categoryBreakdown.map((_, i) => (
                    <Cell key={i} fill={CHART.series[i % CHART.series.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {isAdmin && (
          <SectionCard>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Team capacity</h3>
                <p className="mt-0.5 text-xs text-gray-500">Open tasks per member, by urgency</p>
              </div>
              <Link href="/capacity" className="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-white">
                Details <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            </div>
            {teamCapacity.length === 0 ? (
              <EmptyChart label="No team members yet" />
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(150, teamCapacity.length * 30)}>
                <BarChart data={teamCapacity} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }} barCategoryGap="28%">
                  <CartesianGrid stroke={CHART.grid} horizontal={false} />
                  <XAxis type="number" tick={{ fill: CHART.axis, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: CHART.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={62} />
                  <Tooltip contentStyle={CHART.tooltip} labelStyle={CHART.tooltipLabel} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="overdue" name="Overdue" stackId="c" fill="#f0484a" maxBarSize={18} />
                  <Bar dataKey="thisWeek" name="This week" stackId="c" fill="#ff9557" maxBarSize={18} />
                  <Bar dataKey="later" name="Later" stackId="c" fill={CHART.accent} radius={[0, 4, 4, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <Legend swatch="#f0484a" label="Overdue" />
              <Legend swatch="#ff9557" label="Due this week" />
              <Legend swatch={CHART.accent} label="Later" />
            </div>
          </SectionCard>
        )}
      </div>

      {/* Recent clients */}
      {isAdmin && (
        <ListCard title="Recent clients" href="/clients" empty="No clients yet" isEmpty={clients.length === 0}>
          {clients.map((client) => {
            const active = client.projects.filter((p) => p.status === "ACTIVE").length;
            return (
              <div key={client.id} className="flex items-center justify-between gap-4 px-5 py-2.5">
                <span className="truncate text-sm text-gray-200">{client.name}</span>
                <span className="shrink-0 text-xs text-gray-500 tabular-nums">
                  {active} active · {client.projects.length} total
                </span>
              </div>
            );
          })}
        </ListCard>
      )}

      {/* Recent tasks */}
      <ListCard title="Recent tasks" href="/tasks" empty="No tasks yet — create your first one" isEmpty={recentTasks.length === 0}>
        {recentTasks.map((task) => (
          <div key={task.id} className="flex items-center gap-3.5 px-5 py-2.5 transition-colors hover:bg-gray-800/30">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-gray-100">{task.title}</p>
              <p className="mt-0.5 truncate text-xs text-gray-500">
                {task.project?.client?.name && `${task.project.client.name} · `}
                {task.project?.name}
                {task.assignee && ` · ${task.assignee.name}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              {task.dueDate && (
                <span className={`hidden text-xs tabular-nums sm:inline ${isOverdue(task.dueDate) && task.status !== "DONE" ? "text-red-400" : "text-gray-500"}`}>
                  {formatDate(task.dueDate)}
                </span>
              )}
              <Badge tone={STATUS_TONE[task.status] ?? "neutral"}>{task.status.replace(/_/g, " ").toLowerCase()}</Badge>
            </div>
          </div>
        ))}
      </ListCard>
    </div>
  );
}

/* ── small building blocks ─────────────────────────────────────────────────── */

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-gray-800 bg-gray-900 p-5 ${className}`}>
      {children}
    </section>
  );
}

function CardHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-0.5 text-xs text-gray-500">{sub}</p>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return <div className="flex h-40 items-center justify-center text-xs text-gray-600">{label}</div>;
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: swatch }} />
      {label}
    </span>
  );
}

function ListCard({
  title, href, isEmpty, empty, children,
}: {
  title: string; href: string; isEmpty: boolean; empty: string; children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-800 px-5 py-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <Link href={href} className="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-white">
          View all <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
      {isEmpty ? (
        <p className="px-5 py-10 text-center text-sm text-gray-600">{empty}</p>
      ) : (
        <div className="divide-y divide-gray-800/70">{children}</div>
      )}
    </section>
  );
}

function KpiCard({ label, value, sub, Icon, danger }: {
  label: string; value: number; sub: string; Icon: React.ComponentType<{ className?: string }>; danger?: boolean;
}) {
  return (
    <div className={`rounded-xl border bg-gray-900 p-3.5 transition-colors hover:border-gray-700 ${danger ? "border-red-500/30" : "border-gray-800"}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-gray-500">{label}</span>
        <Icon className={`h-3.5 w-3.5 ${danger ? "text-red-400" : "text-gray-600"}`} />
      </div>
      <p className={`mt-2 text-[22px] font-semibold tabular-nums ${danger ? "text-red-400" : "text-white"}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-gray-500">{sub}</p>
    </div>
  );
}
