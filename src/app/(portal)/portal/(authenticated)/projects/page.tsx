"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { FolderOpen, CheckCircle, Clock, AlertCircle, Calendar } from "lucide-react";
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
  TODO:            { label: "To Do",            color: "text-gray-400",   bg: "bg-gray-700",        dot: "bg-gray-500" },
  IN_PROGRESS:     { label: "In Progress",      color: "text-blue-400",   bg: "bg-blue-500/20",     dot: "bg-blue-500" },
  IN_REVIEW:       { label: "Agency Review",    color: "text-yellow-400", bg: "bg-yellow-500/20",   dot: "bg-yellow-500" },
  CLIENT_APPROVAL: { label: "Your Approval",    color: "text-purple-400", bg: "bg-purple-500/20",   dot: "bg-purple-500" },
  REVISION:        { label: "Revision",         color: "text-orange-400", bg: "bg-orange-500/20",   dot: "bg-orange-500" },
  DONE:            { label: "Done",             color: "text-green-400",  bg: "bg-green-500/20",    dot: "bg-green-500" },
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">My Projects</h1>
        <p className="text-sm text-gray-400 mt-1">{projects.length} project{projects.length !== 1 ? "s" : ""} in your account</p>
      </div>

      {projects.length === 0 && (
        <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-xl">
          <FolderOpen className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No projects yet</p>
        </div>
      )}

      {projects.map((project) => {
        const done = project.tasks.filter((t) => t.status === "DONE").length;
        const completion = project.tasks.length ? Math.round((done / project.tasks.length) * 100) : 0;
        const needsApproval = project.tasks.filter((t) => t.status === "CLIENT_APPROVAL").length;

        return (
          <div key={project.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            {/* Project header */}
            <div className="px-6 py-5 border-b border-gray-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-base font-semibold text-white">{project.name}</h2>
                    {needsApproval > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-medium">
                        {needsApproval} awaiting approval
                      </span>
                    )}
                  </div>
                  {project.description && (
                    <p className="text-xs text-gray-400">{project.description}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xl font-bold text-white">{completion}%</p>
                  <p className="text-xs text-gray-500">complete</p>
                </div>
              </div>

              {/* Dates + Progress */}
              <div className="mt-4 space-y-2">
                {project.dueDate && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Calendar className="w-3.5 h-3.5" />
                    Due {new Date(project.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                )}
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: `${completion}%` }} />
                </div>
                <p className="text-xs text-gray-600">{done} of {project.tasks.length} deliverables done</p>
              </div>
            </div>

            {/* Task list */}
            {project.tasks.length > 0 && (
              <div className="divide-y divide-gray-800/50">
                {project.tasks.map((task) => {
                  const cfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.TODO;
                  return (
                    <div key={task.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-800/30 transition-colors">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{task.title}</p>
                        {task.assignee && (
                          <p className="text-xs text-gray-500">{CATEGORY_LABEL[task.category]} · {task.assignee.name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {task.dueDate && (
                          <span className="text-xs text-gray-500 hidden sm:block">
                            {new Date(task.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </span>
                        )}
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
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
  );
}
