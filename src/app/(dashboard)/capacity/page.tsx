import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CalendarDays, AlertTriangle, CheckCircle, Clock } from "lucide-react";

function getDaysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function getCapacityData() {
  const nextWeek = getDaysFromNow(7);

  const users = await prisma.user.findMany({
    where: { isActive: true, role: { name: { not: "client" } } },
    include: {
      role: true,
      assignedTasks: {
        where: { status: { not: "DONE" } },
        include: { project: { select: { name: true, client: { select: { name: true } } } } },
        orderBy: { dueDate: "asc" },
      },
    },
  });

  return users.map((user) => {
    const overdue = user.assignedTasks.filter(
      (t) => t.dueDate && t.dueDate < new Date() && t.status !== "DONE"
    );
    const dueThisWeek = user.assignedTasks.filter(
      (t) => t.dueDate && t.dueDate >= new Date() && t.dueDate <= nextWeek
    );
    const totalActive = user.assignedTasks.length;
    const load = totalActive >= 8 ? "overloaded" : totalActive >= 5 ? "busy" : totalActive >= 2 ? "normal" : "free";

    return { ...user, overdue, dueThisWeek, totalActive, load };
  });
}

const LOAD_CONFIG = {
  free:       { label: "Free",       color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20", dot: "bg-green-400" },
  normal:     { label: "Normal",     color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20",   dot: "bg-blue-400" },
  busy:       { label: "Busy",       color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", dot: "bg-yellow-400" },
  overloaded: { label: "Overloaded", color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20",     dot: "bg-red-400" },
};

const AVATAR_COLORS = [
  "bg-indigo-500", "bg-pink-500", "bg-green-500", "bg-yellow-500",
  "bg-blue-500", "bg-purple-500", "bg-orange-500",
];

export default async function CapacityPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const users = await getCapacityData();
  const overloaded = users.filter((u) => u.load === "overloaded").length;
  const withOverdue = users.filter((u) => u.overdue.length > 0).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Team Capacity</h1>
        <p className="text-sm text-gray-400 mt-1">See who&apos;s free, busy, or overloaded right now</p>
      </div>

      {/* Alerts */}
      {(overloaded > 0 || withOverdue > 0) && (
        <div className="space-y-2">
          {overloaded > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-300">
                <span className="font-semibold">{overloaded} team member{overloaded > 1 ? "s" : ""}</span>{" "}
                overloaded (8+ active tasks). Consider redistributing.
              </p>
            </div>
          )}
          {withOverdue > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
              <Clock className="w-4 h-4 text-orange-400 shrink-0" />
              <p className="text-sm text-orange-300">
                <span className="font-semibold">{withOverdue} member{withOverdue > 1 ? "s" : ""}</span>{" "}
                have overdue tasks that need attention.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Capacity grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {users.map((user) => {
          const cfg = LOAD_CONFIG[user.load as keyof typeof LOAD_CONFIG];
          const avatarColor = AVATAR_COLORS[user.name.charCodeAt(0) % AVATAR_COLORS.length];
          const barWidth = Math.min((user.totalActive / 10) * 100, 100);

          return (
            <div key={user.id} className={`bg-gray-900 border rounded-xl p-5 ${cfg.bg}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full ${avatarColor} flex items-center justify-center text-sm font-bold text-white shrink-0`}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{user.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{user.role.name.replace(/_/g, " ")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                </div>
              </div>

              {/* Load bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-400">Active tasks</span>
                  <span className="text-xs font-semibold text-white">{user.totalActive}</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      user.load === "overloaded" ? "bg-red-500" :
                      user.load === "busy" ? "bg-yellow-500" :
                      user.load === "normal" ? "bg-blue-500" : "bg-green-500"
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>

              {/* Overdue */}
              {user.overdue.length > 0 && (
                <div className="mb-3 p-2.5 bg-red-500/10 rounded-lg">
                  <p className="text-[11px] font-semibold text-red-400 mb-1.5">
                    {user.overdue.length} Overdue
                  </p>
                  {user.overdue.slice(0, 2).map((t) => (
                    <p key={t.id} className="text-[11px] text-red-300/70 truncate">• {t.title}</p>
                  ))}
                  {user.overdue.length > 2 && (
                    <p className="text-[11px] text-red-400/50">+{user.overdue.length - 2} more</p>
                  )}
                </div>
              )}

              {/* Due this week */}
              {user.dueThisWeek.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 mb-1.5">Due this week</p>
                  {user.dueThisWeek.slice(0, 3).map((t) => (
                    <div key={t.id} className="flex items-center gap-1.5 mb-1">
                      <div className="w-1 h-1 rounded-full bg-yellow-400 shrink-0" />
                      <p className="text-[11px] text-gray-300 truncate">{t.title}</p>
                      {t.dueDate && (
                        <span className="text-[10px] text-gray-500 shrink-0 ml-auto">
                          {new Date(t.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {user.totalActive === 0 && (
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Available for new tasks
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
