"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { CheckCircle, Clock, AlertCircle, FolderOpen, TrendingUp } from "lucide-react";

type Task = {
  id: string;
  title: string;
  status: string;
  category: string;
  dueDate?: string;
  assignee?: { name: string };
};

type Project = {
  id: string;
  name: string;
  status: string;
  dueDate?: string;
  tasks: Task[];
  _count: { tasks: number };
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  TODO:            { label: "To Do",           color: "text-gray-400",   bg: "bg-gray-700" },
  IN_PROGRESS:     { label: "In Progress",     color: "text-blue-400",   bg: "bg-blue-500/20" },
  IN_REVIEW:       { label: "In Review",       color: "text-yellow-400", bg: "bg-yellow-500/20" },
  CLIENT_APPROVAL: { label: "Awaiting Approval", color: "text-purple-400", bg: "bg-purple-500/20" },
  REVISION:        { label: "Revision",        color: "text-orange-400", bg: "bg-orange-500/20" },
  DONE:            { label: "Done",            color: "text-green-400",  bg: "bg-green-500/20" },
};

export default function PortalOverviewPage() {
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["portal-projects"],
    queryFn: () => axios.get("/api/portal/projects").then((r) => r.data),
  });

  const allTasks = projects.flatMap((p) => p.tasks);
  const done = allTasks.filter((t) => t.status === "DONE").length;
  const pending = allTasks.filter((t) => t.status === "CLIENT_APPROVAL").length;
  const inProgress = allTasks.filter((t) => ["IN_PROGRESS", "IN_REVIEW"].includes(t.status)).length;
  const completion = allTasks.length ? Math.round((done / allTasks.length) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" role="status" aria-label="Loading">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/10 border border-indigo-500/20 rounded-2xl p-6">
        <h1 className="text-[22px] font-semibold tracking-tight text-white mb-1">Your Project Dashboard</h1>
        <p className="text-gray-400 text-sm">Track deliverables, approve work, and monitor progress — all in one place.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Projects", value: projects.filter(p => p.status === "ACTIVE").length, icon: <FolderOpen className="w-4 h-4 text-indigo-400" /> },
          { label: "Awaiting Approval", value: pending, icon: <AlertCircle className="w-4 h-4 text-purple-400" />, highlight: pending > 0 },
          { label: "In Progress", value: inProgress, icon: <Clock className="w-4 h-4 text-blue-400" /> },
          { label: "Completed", value: done, icon: <CheckCircle className="w-4 h-4 text-green-400" /> },
        ].map(({ label, value, icon, highlight }) => (
          <div key={label} className={`rounded-xl border p-4 ${highlight ? "bg-purple-500/10 border-purple-500/30" : "bg-gray-900 border-gray-800"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">{label}</span>
              {icon}
            </div>
            <p className={`text-2xl font-bold ${highlight ? "text-purple-400" : "text-white"}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-medium text-white">Overall Completion</span>
          </div>
          <span className="text-sm font-bold text-indigo-400">{completion}%</span>
        </div>
        <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700" style={{ width: `${completion}%` }} />
        </div>
        <p className="text-xs text-gray-500 mt-2">{done} of {allTasks.length} deliverables complete</p>
      </div>

      {/* Projects */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-4">Your Projects</h2>
        {projects.length === 0 && (
          <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-xl">
            <FolderOpen className="w-8 h-8 text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No projects yet</p>
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-4">
          {projects.map((project) => {
            const projectDone = project.tasks.filter((t) => t.status === "DONE").length;
            const projectCompletion = project.tasks.length ? Math.round((projectDone / project.tasks.length) * 100) : 0;
            const needsApproval = project.tasks.filter((t) => t.status === "CLIENT_APPROVAL").length;

            return (
              <div key={project.id} className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-5 transition-colors cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{project.name}</h3>
                    {project.dueDate && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Due {new Date(project.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </p>
                    )}
                  </div>
                  {needsApproval > 0 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-medium shrink-0">
                      {needsApproval} to approve
                    </span>
                  )}
                </div>

                {/* Mini task list */}
                <div className="space-y-1.5 mb-4">
                  {project.tasks.slice(0, 4).map((task) => {
                    const cfg = STATUS_CONFIG[task.status];
                    return (
                      <div key={task.id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.bg}`} />
                          <span className="text-xs text-gray-300 truncate">{task.title}</span>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                    );
                  })}
                  {project.tasks.length > 4 && (
                    <p className="text-xs text-gray-600 pl-3.5">+{project.tasks.length - 4} more</p>
                  )}
                </div>

                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${projectCompletion}%` }} />
                </div>
                <p className="text-xs text-gray-600 mt-1">{projectCompletion}% complete</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
