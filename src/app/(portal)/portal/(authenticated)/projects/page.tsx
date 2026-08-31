"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Calendar } from "lucide-react";
import { CATEGORY_LABEL } from "@/lib/constants";

type Task = {
  id: string; title: string; status: string; category: string;
  dueDate?: string; assignee?: { name: string };
};
type Project = {
  id: string; name: string; description?: string; status: string;
  startDate?: string; dueDate?: string; tasks: Task[];
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  TODO:            { label: "To do",       color: "text-gray-400",   bg: "bg-gray-800/80",   dot: "bg-gray-500" },
  IN_PROGRESS:     { label: "In progress", color: "text-blue-400",   bg: "bg-blue-400/12",   dot: "bg-blue-400" },
  IN_REVIEW:       { label: "In review",   color: "text-yellow-400", bg: "bg-yellow-400/12", dot: "bg-yellow-400" },
  CLIENT_APPROVAL: { label: "Your approval", color: "text-purple-400", bg: "bg-purple-400/12", dot: "bg-purple-400" },
  REVISION:        { label: "Revision",    color: "text-orange-400", bg: "bg-orange-400/12", dot: "bg-orange-400" },
  DONE:            { label: "Done",        color: "text-green-400",  bg: "bg-green-400/12",  dot: "bg-green-400" },
};

export default function PortalProjectsPage() {
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["portal-projects"],
    queryFn: () => axios.get("/api/portal/projects").then((r) => r.data),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64" role="status" aria-label="Loading">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-white">Projects</h1>
        <p className="mt-1 text-sm text-gray-500">{projects.length} in your account</p>
      </div>

      {projects.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-800 bg-gray-900/40 py-16 text-center text-sm text-gray-600">
          No projects yet
        </div>
      )}

      <div className="space-y-4">
        {projects.map((project) => {
          const done = project.tasks.filter((t) => t.status === "DONE").length;
          const completion = project.tasks.length ? Math.round((done / project.tasks.length) * 100) : 0;
          const needsApproval = project.tasks.filter((t) => t.status === "CLIENT_APPROVAL").length;

          return (
            <div key={project.id} className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
              <div className="border-b border-gray-800 px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-1 flex items-center gap-2.5">
                      <h2 className="text-sm font-semibold text-white">{project.name}</h2>
                      {needsApproval > 0 && (
                        <span className="rounded-full bg-purple-400/12 px-2 py-0.5 text-[11px] font-medium text-purple-400">
                          {needsApproval} awaiting you
                        </span>
                      )}
                    </div>
                    {project.description && <p className="text-xs text-gray-500">{project.description}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-semibold tabular-nums text-white">{completion}%</p>
                    <p className="text-[11px] text-gray-500">complete</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {project.dueDate && (
                    <p className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                      Due {new Date(project.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  )}
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${completion}%` }} />
                  </div>
                  <p className="text-xs text-gray-600">{done} of {project.tasks.length} deliverables done</p>
                </div>
              </div>

              {project.tasks.length > 0 && (
                <div className="divide-y divide-gray-800/60">
                  {project.tasks.map((task) => {
                    const cfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.TODO;
                    return (
                      <div key={task.id} className="flex items-center gap-3.5 px-5 py-3 transition-colors hover:bg-gray-800/30">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${cfg.dot}`} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] text-gray-100">{task.title}</p>
                          {task.assignee && (
                            <p className="text-xs text-gray-500">{CATEGORY_LABEL[task.category]} · {task.assignee.name}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {task.dueDate && (
                            <span className="hidden text-xs text-gray-500 tabular-nums sm:block">
                              {new Date(task.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </span>
                          )}
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
