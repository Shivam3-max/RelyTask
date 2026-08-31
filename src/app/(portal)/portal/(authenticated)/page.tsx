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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  TODO:            { label: "To do",           color: "text-gray-400",   bg: "bg-gray-800/80",       dot: "bg-gray-500" },
  IN_PROGRESS:     { label: "In progress",     color: "text-blue-400",   bg: "bg-blue-400/12",       dot: "bg-blue-400" },
  IN_REVIEW:       { label: "In review",       color: "text-yellow-400", bg: "bg-yellow-400/12",     dot: "bg-yellow-400" },
  CLIENT_APPROVAL: { label: "Awaiting you",    color: "text-purple-400", bg: "bg-purple-400/12",     dot: "bg-purple-400" },
  REVISION:        { label: "Revision",        color: "text-orange-400", bg: "bg-orange-400/12",     dot: "bg-orange-400" },
  DONE:            { label: "Done",            color: "text-green-400",  bg: "bg-green-400/12",       dot: "bg-green-400" },
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
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-white">Overview</h1>
        <p className="mt-1 text-sm text-gray-500">Track deliverables, approve work, and follow progress.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Active projects", value: projects.filter((p) => p.status === "ACTIVE").length, Icon: FolderOpen },
          { label: "Awaiting approval", value: pending, Icon: AlertCircle, highlight: pending > 0 },
          { label: "In progress", value: inProgress, Icon: Clock },
          { label: "Completed", value: done, Icon: CheckCircle },
        ].map(({ label, value, Icon, highlight }) => (
          <div key={label} className={`rounded-xl border p-3.5 ${highlight ? "border-purple-500/30 bg-purple-500/10" : "border-gray-800 bg-gray-900"}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-gray-500">{label}</span>
              <Icon className={`h-3.5 w-3.5 ${highlight ? "text-purple-400" : "text-gray-600"}`} />
            </div>
            <p className={`mt-2 text-[22px] font-semibold tabular-nums ${highlight ? "text-purple-400" : "text-white"}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium text-white">
            <TrendingUp className="h-4 w-4 text-gray-500" aria-hidden="true" /> Overall completion
          </span>
          <span className="text-sm font-semibold tabular-nums text-white">{completion}%</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-800">
          <div className="h-full rounded-full bg-indigo-500 transition-[width] duration-700 ease-out" style={{ width: `${completion}%` }} />
        </div>
        <p className="mt-2 text-xs text-gray-500">{done} of {allTasks.length} deliverables complete</p>
      </div>

      {/* Projects */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-white">Your projects</h2>
        {projects.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-800 bg-gray-900/40 py-12 text-center text-sm text-gray-600">
            No projects yet
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {projects.map((project) => {
            const projectDone = project.tasks.filter((t) => t.status === "DONE").length;
            const projectCompletion = project.tasks.length ? Math.round((projectDone / project.tasks.length) * 100) : 0;
            const needsApproval = project.tasks.filter((t) => t.status === "CLIENT_APPROVAL").length;

            return (
              <div key={project.id} className="rounded-xl border border-gray-800 bg-gray-900 p-4 transition-colors hover:border-gray-700">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{project.name}</h3>
                    {project.dueDate && (
                      <p className="mt-0.5 text-xs text-gray-500">
                        Due {new Date(project.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </p>
                    )}
                  </div>
                  {needsApproval > 0 && (
                    <span className="shrink-0 rounded-full bg-purple-400/12 px-2 py-0.5 text-[11px] font-medium text-purple-400">
                      {needsApproval} to approve
                    </span>
                  )}
                </div>

                <div className="mb-4 space-y-1.5">
                  {project.tasks.slice(0, 4).map((task) => {
                    const cfg = STATUS_CONFIG[task.status];
                    return (
                      <div key={task.id} className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
                          <span className="truncate text-xs text-gray-300">{task.title}</span>
                        </span>
                        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      </div>
                    );
                  })}
                  {project.tasks.length > 4 && (
                    <p className="pl-3.5 text-xs text-gray-600">+{project.tasks.length - 4} more</p>
                  )}
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
                  <div className="h-full rounded-full bg-indigo-500" style={{ width: `${projectCompletion}%` }} />
                </div>
                <p className="mt-1 text-xs text-gray-600 tabular-nums">{projectCompletion}% complete</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
