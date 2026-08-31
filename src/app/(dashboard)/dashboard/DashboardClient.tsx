"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  CheckSquare, AlertTriangle, FolderOpen, Users,
  UserCircle, TrendingUp, Clock, Zap, ArrowUp, ArrowDown,
} from "lucide-react";
import { formatDate, isOverdue } from "@/lib/utils";
import { ADMIN_ROLES, CATEGORY_LABEL, PRIORITY_DOT } from "@/lib/constants";

const STATUS_COLORS: Record<string, string> = {
  TODO: "bg-gray-700 text-gray-300",
  IN_PROGRESS: "bg-blue-500/20 text-blue-400",
  IN_REVIEW: "bg-yellow-500/20 text-yellow-400",
  CLIENT_APPROVAL: "bg-purple-500/20 text-purple-400",
  REVISION: "bg-orange-500/20 text-orange-400",
  DONE: "bg-green-500/20 text-green-400",
};


const BAR_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f97316", "#eab308", "#22c55e"];

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

// Renders nothing until mounted so the server/client markup can't disagree on
// the current minute; then shows the local date + 12-hour time, refreshed each
// half-minute.
function LiveDateTime() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // Client-only: sync to the real clock after hydration, then keep it current.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!now) return null;
  return (
    <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg">
      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
      {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
      {" · "}
      {now.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}
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

type Props = {
  data: {
    stats: { totalTasks: number; doneTasks: number; overdueTasks: number; activeProjects: number; teamCount: number; clientCount: number | null };
    completionTrend: { day: string; completed: number; created: number }[];
    statusBreakdown: { name: string; value: number; color: string }[];
    categoryBreakdown: { name: string; value: number }[];
    teamWorkload: { name: string; tasks: number; role: string }[];
    recentTasks: RecentTask[];
    clients: ClientSummary[];
  };
  user: { name: string; role: string };
};

export function DashboardClient({ data, user }: Props) {
  const { stats, completionTrend, statusBreakdown, categoryBreakdown, teamWorkload, recentTasks, clients } = data;
  const completion = stats.totalTasks ? Math.round((stats.doneTasks / stats.totalTasks) * 100) : 0;
  const isAdmin = (ADMIN_ROLES as readonly string[]).includes(user.role);

  const kpis = [
    { label: isAdmin ? "Total Tasks" : "My Tasks", value: stats.totalTasks, sub: `${completion}% done`, icon: <CheckSquare className="w-4 h-4 text-indigo-400" aria-hidden="true" /> },
    { label: isAdmin ? "Overdue" : "My Overdue", value: stats.overdueTasks, sub: "Need action", icon: <AlertTriangle className="w-4 h-4 text-red-400" aria-hidden="true" />, danger: stats.overdueTasks > 0 },
    { label: isAdmin ? "Active Projects" : "My Active Projects", value: stats.activeProjects, sub: isAdmin ? "Running now" : "You have tasks in", icon: <FolderOpen className="w-4 h-4 text-blue-400" aria-hidden="true" /> },
    { label: "Team Members", value: stats.teamCount, sub: "Active", icon: <Users className="w-4 h-4 text-green-400" aria-hidden="true" /> },
    ...(stats.clientCount !== null
      ? [{ label: "Clients", value: stats.clientCount, sub: "Total", icon: <UserCircle className="w-4 h-4 text-purple-400" aria-hidden="true" /> }]
      : []),
    { label: isAdmin ? "Completed" : "My Completed", value: stats.doneTasks, sub: "All time", icon: <TrendingUp className="w-4 h-4 text-yellow-400" aria-hidden="true" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">
            Good {getTimeOfDay()}, {user.name.split(" ")[0]} 👋
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Here&apos;s what&apos;s happening across your organization today</p>
        </div>
        <LiveDateTime />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Overall progress bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400" aria-hidden="true" />
            <span className="text-sm font-semibold text-white">Organization Performance</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> Completed</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-700 inline-block" /> Remaining</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1000"
              style={{ width: `${completion}%` }}
            />
          </div>
          <span className="text-2xl font-bold text-white shrink-0">{completion}%</span>
        </div>
        <div className="flex items-center gap-6 mt-3 text-xs text-gray-500">
          <span>{stats.doneTasks} completed</span>
          <span>{stats.totalTasks - stats.doneTasks} remaining</span>
          {stats.overdueTasks > 0 && (
            <span className="text-red-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" aria-hidden="true" />{stats.overdueTasks} overdue
            </span>
          )}
        </div>
      </div>

      {/* Charts Row 1: Area + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Completion trend - 2/3 width */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-white">Task Activity</h3>
              <p className="text-xs text-gray-500 mt-0.5">Created vs completed — last 7 days</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={completionTrend} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#9ca3af" }}
              />
              <Area type="monotone" dataKey="completed" name="Completed" stroke="#6366f1" strokeWidth={2} fill="url(#colorCompleted)" dot={{ fill: "#6366f1", r: 3 }} />
              <Area type="monotone" dataKey="created" name="Created" stroke="#22c55e" strokeWidth={2} fill="url(#colorCreated)" dot={{ fill: "#22c55e", r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status donut - 1/3 width */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Task Status</h3>
          <p className="text-xs text-gray-500 mb-4">Current breakdown</p>
          {statusBreakdown.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-600 text-xs">No tasks yet</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                    dataKey="value" paddingAngle={3} strokeWidth={0}>
                    {statusBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {statusBreakdown.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                      <span className="text-gray-400">{s.name}</span>
                    </div>
                    <span className="text-white font-medium">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Charts Row 2: Category bar + Team workload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category breakdown */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-1">Work by Category</h3>
          <p className="text-xs text-gray-500 mb-5">Volume per service type</p>
          {categoryBreakdown.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-600 text-xs">No tasks yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={categoryBreakdown.map(c => ({ ...c, name: CATEGORY_LABEL[c.name] ?? c.name }))}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#9ca3af" }}
                />
                <Bar dataKey="value" name="Tasks" radius={[4, 4, 0, 0]}>
                  {categoryBreakdown.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Team workload */}
        {isAdmin && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Team Workload</h3>
            <p className="text-xs text-gray-500 mb-5">Active tasks per member</p>
            {teamWorkload.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-gray-600 text-xs">No team members yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={teamWorkload} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#9ca3af" }}
                    formatter={(v: any, n: any, p: any) => [v, `${p.payload.role}`]}
                  />
                  <Bar dataKey="tasks" name="Tasks" radius={[0, 4, 4, 0]} fill="#6366f1">
                    {teamWorkload.map((entry, i) => (
                      <Cell key={i} fill={entry.tasks >= 8 ? "#ef4444" : entry.tasks >= 5 ? "#f97316" : "#6366f1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />Normal</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />Busy (5+)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Overloaded (8+)</span>
            </div>
          </div>
        )}
      </div>

      {/* Recent clients — admin-only, org-wide view non-admins don't get */}
      {isAdmin && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <UserCircle className="w-4 h-4 text-gray-400" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-white">Recent Clients</h3>
            </div>
            <Link href="/clients" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">View all →</Link>
          </div>
          {clients.length === 0 ? (
            <p className="px-5 py-10 text-sm text-gray-600 text-center">No clients yet</p>
          ) : (
            <div className="divide-y divide-gray-800/60">
              {clients.map((client) => {
                const active = client.projects.filter((p) => p.status === "ACTIVE").length;
                return (
                  <div key={client.id} className="flex items-center justify-between gap-4 px-5 py-3">
                    <span className="text-sm text-white truncate">{client.name}</span>
                    <span className="text-xs text-gray-500 shrink-0">
                      {active} active · {client.projects.length} total
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Recent tasks */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-white">Recent Tasks</h3>
          </div>
          <Link href="/tasks" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">View all →</Link>
        </div>
        {recentTasks.length === 0 ? (
          <p className="px-5 py-10 text-sm text-gray-600 text-center">No tasks yet — create your first task</p>
        ) : (
          <div className="divide-y divide-gray-800/60">
            {recentTasks.map((task: any) => (
              <div key={task.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-800/30 transition-colors">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[task.priority]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{task.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {task.project?.client?.name && `${task.project.client.name} · `}
                    {task.project?.name}
                    {task.assignee && ` · ${task.assignee.name}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {task.dueDate && (
                    <span className={`hidden sm:inline text-xs ${isOverdue(task.dueDate) && task.status !== "DONE" ? "text-red-400" : "text-gray-500"}`}>
                      {formatDate(task.dueDate)}
                    </span>
                  )}
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[task.status]}`}>
                    {task.status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feature Ideas Panel — product roadmap, only relevant to admins */}
      {isAdmin && (
      <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border border-indigo-500/20 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-indigo-400" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-white">Coming Next — Power Features</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "AI Brief Writer", desc: "Client fills form → AI writes brief", tag: "AI", color: "text-purple-400 bg-purple-500/10" },
            { label: "Time Tracker", desc: "Start/stop per task → billing report", tag: "Billing", color: "text-green-400 bg-green-500/10" },
            { label: "Auto Invoice", desc: "Approval → invoice auto-sent", tag: "Revenue", color: "text-yellow-400 bg-yellow-500/10" },
            { label: "Content Calendar", desc: "Visual schedule per client", tag: "Planning", color: "text-blue-400 bg-blue-500/10" },
          ].map(({ label, desc, tag, color }) => (
            <div key={label} className="bg-gray-900/60 border border-gray-800 rounded-lg p-3">
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${color}`}>{tag}</span>
              <p className="text-xs font-medium text-white mt-2">{label}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, icon, danger }: {
  label: string; value: number; sub: string; icon: React.ReactNode; danger?: boolean;
}) {
  return (
    <div className={`bg-gray-900 rounded-xl border p-4 ${danger ? "border-red-500/30" : "border-gray-800"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-gray-400 font-medium">{label}</span>
        {icon}
      </div>
      <p className={`text-2xl font-bold ${danger ? "text-red-400" : "text-white"}`}>{value}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>
    </div>
  );
}
