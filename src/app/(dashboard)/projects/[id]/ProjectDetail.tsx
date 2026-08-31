"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import {
  ArrowLeft, Plus, CheckSquare, Calendar, Users, BookOpen,
  AlertTriangle, Clock, CheckCircle, MoreVertical, Zap
} from "lucide-react";
import { formatDate, isOverdue } from "@/lib/utils";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { CATEGORY_LABEL_FULL, getAvatarColor } from "@/lib/constants";
import { hasPermission } from "@/lib/permissions";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  TODO:            { label: "To Do",           color: "text-gray-300",   bg: "bg-gray-700",        dot: "bg-gray-500" },
  IN_PROGRESS:     { label: "In Progress",     color: "text-blue-400",   bg: "bg-blue-500/20",     dot: "bg-blue-400" },
  IN_REVIEW:       { label: "In Review",       color: "text-yellow-400", bg: "bg-yellow-500/20",   dot: "bg-yellow-400" },
  CLIENT_APPROVAL: { label: "Client Approval", color: "text-purple-400", bg: "bg-purple-500/20",   dot: "bg-purple-400" },
  REVISION:        { label: "Revision",        color: "text-orange-400", bg: "bg-orange-500/20",   dot: "bg-orange-400" },
  DONE:            { label: "Done",            color: "text-green-400",  bg: "bg-green-500/20",    dot: "bg-green-400" },
};

const PRIORITY_CONFIG: Record<string, { color: string; dot: string }> = {
  LOW:    { color: "text-gray-400",   dot: "bg-gray-500" },
  MEDIUM: { color: "text-blue-400",   dot: "bg-blue-500" },
  HIGH:   { color: "text-orange-400", dot: "bg-orange-500" },
  URGENT: { color: "text-red-400",    dot: "bg-red-500" },
};


type Task = {
  id: string; title: string; description?: string; status: string;
  category: string; priority: string; dueDate?: string;
  assignee?: { id: string; name: string };
  _count: { comments: number; files: number; subtasks: number };
};
type Project = {
  id: string; name: string; description?: string; status: string;
  startDate?: string; dueDate?: string;
  client: { name: string; companyName?: string };
  tasks: Task[];
  _count: { tasks: number };
};
type User = { id: string; name: string; role: { name: string } };
type SopTemplate = { id: string; name: string; category: string; steps: { title: string; description?: string }[] };

const EMPTY_FORM = {
  title: "", description: "", category: "VIDEO_EDITING",
  priority: "MEDIUM", assigneeId: "", dueDate: "", subtasks: [""],
};

export function ProjectDetail({ project, users, sops }: {
  project: Project; users: User[]; sops: SopTemplate[];
}) {
  const { data: session } = useSession();
  const canCreateTask = !!session && hasPermission(session, "tasks", "create");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [localTasks, setLocalTasks] = useState<Task[]>(project.tasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: (data: typeof form) =>
      axios.post("/api/tasks", { ...data, projectId: project.id }),
    onSuccess: (res) => {
      setLocalTasks((prev) => [res.data, ...prev]);
      setCreating(false);
      setForm(EMPTY_FORM);
    },
  });

  // Auto-fill subtasks when SOP matches category
  function handleCategoryChange(cat: string) {
    const matchingSop = sops.find((s) => s.category === cat);
    setForm((f) => ({
      ...f,
      category: cat,
      subtasks: matchingSop ? matchingSop.steps.map((s) => s.title) : [""],
    }));
  }

  const done = localTasks.filter((t) => t.status === "DONE").length;
  const overdue = localTasks.filter((t) => t.dueDate && isOverdue(t.dueDate) && t.status !== "DONE").length;
  const completion = localTasks.length ? Math.round((done / localTasks.length) * 100) : 0;

  const grouped = {
    TODO:            localTasks.filter((t) => t.status === "TODO"),
    IN_PROGRESS:     localTasks.filter((t) => t.status === "IN_PROGRESS"),
    IN_REVIEW:       localTasks.filter((t) => t.status === "IN_REVIEW"),
    CLIENT_APPROVAL: localTasks.filter((t) => t.status === "CLIENT_APPROVAL"),
    REVISION:        localTasks.filter((t) => t.status === "REVISION"),
    DONE:            localTasks.filter((t) => t.status === "DONE"),
  };

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to Projects
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-xl md:text-2xl font-bold text-white">{project.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                project.status === "ACTIVE" ? "bg-green-500/20 text-green-400" :
                project.status === "ON_HOLD" ? "bg-yellow-500/20 text-yellow-400" :
                project.status === "COMPLETED" ? "bg-blue-500/20 text-blue-400" :
                "bg-red-500/20 text-red-400"
              }`}>{project.status.replace("_", " ")}</span>
            </div>
            <p className="text-indigo-400 text-sm font-medium">
              {project.client.companyName ?? project.client.name}
            </p>
            {project.description && (
              <p className="text-gray-400 text-sm mt-1">{project.description}</p>
            )}
          </div>
          {canCreateTask && (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" /> Add Task
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox icon={<CheckSquare className="w-4 h-4 text-indigo-400" />} label="Total Tasks" value={localTasks.length} />
        <StatBox icon={<CheckCircle className="w-4 h-4 text-green-400" />} label="Completed" value={done} />
        <StatBox icon={<AlertTriangle className="w-4 h-4 text-red-400" />} label="Overdue" value={overdue} danger={overdue > 0} />
        {project.dueDate && (
          <StatBox icon={<Calendar className="w-4 h-4 text-purple-400" />} label="Due Date" value={formatDate(project.dueDate)} />
        )}
      </div>

      {/* Progress */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white">Project Completion</span>
          <span className="text-sm font-bold text-indigo-400">{completion}%</span>
        </div>
        <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
            style={{ width: `${completion}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1.5">{done} of {localTasks.length} tasks done</p>
      </div>

      {/* Task board — grouped by status */}
      {localTasks.length === 0 ? (
        <div className="text-center py-16 bg-gray-900 border border-gray-800 border-dashed rounded-xl">
          <CheckSquare className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No tasks yet</p>
          <p className="text-sm text-gray-600 mt-1 mb-4">Add your first task to get this project moving</p>
          {canCreateTask && (
            <button
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" /> Add First Task
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {Object.entries(grouped).map(([status, tasks]) => {
            if (tasks.length === 0) return null;
            const cfg = STATUS_CONFIG[status];
            return (
              <div key={status} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                {/* Group header */}
                <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-800">
                  <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                  <span className="text-xs text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded-full">{tasks.length}</span>
                </div>

                {/* Tasks */}
                <div className="divide-y divide-gray-800/50">
                  {tasks.map((task) => {
                    const pCfg = PRIORITY_CONFIG[task.priority];
                    const avatarColor = task.assignee ? getAvatarColor(task.assignee.name) : null;
                    const late = task.dueDate && isOverdue(task.dueDate) && task.status !== "DONE";

                    return (
                      <div
                        key={task.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedTaskId(task.id)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedTaskId(task.id); } }}
                        aria-label={`Open task: ${task.title}`}
                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-800/30 transition-colors group cursor-pointer"
                      >
                        {/* Priority dot */}
                        <div className={`w-2 h-2 rounded-full shrink-0 ${pCfg.dot}`} title={task.priority} />

                        {/* Main content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{task.title}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[11px] text-gray-500">{CATEGORY_LABEL_FULL[task.category]}</span>
                            {task._count.subtasks > 0 && (
                              <span className="text-[11px] text-gray-600">
                                {task._count.subtasks} subtasks
                              </span>
                            )}
                            {task._count.comments > 0 && (
                              <span className="text-[11px] text-gray-600">
                                {task._count.comments} comments
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Assignee */}
                        <div className="shrink-0">
                          {task.assignee ? (
                            <div className="flex items-center gap-1.5">
                              <div className={`w-6 h-6 rounded-full ${avatarColor} flex items-center justify-center text-[10px] font-bold text-white`}>
                                {task.assignee.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs text-gray-400 hidden md:block">
                                {task.assignee.name.split(" ")[0]}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-600">Unassigned</span>
                          )}
                        </div>

                        {/* Due date */}
                        {task.dueDate && (
                          <div className={`hidden sm:flex items-center gap-1 text-xs shrink-0 ${late ? "text-red-400" : "text-gray-500"}`}>
                            {late && <AlertTriangle className="w-3 h-3" />}
                            <Clock className="w-3 h-3" />
                            {formatDate(task.dueDate)}
                          </div>
                        )}

                        {/* Status badge */}
                        <span className={`hidden sm:inline text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Task Modal */}
      {creating && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="add-task-title">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <div>
                <h2 id="add-task-title" className="text-lg font-semibold text-white">Add Task</h2>
                <p className="text-xs text-gray-400 mt-0.5">Project: {project.name}</p>
              </div>
              <button type="button" onClick={() => setCreating(false)} aria-label="Close" className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Task Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Edit Reel #1 — 30 sec version"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Add context for your team..."
                />
              </div>

              {/* Category + Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">
                    Category
                    {sops.find(s => s.category === form.category) && (
                      <span className="ml-2 text-indigo-400 inline-flex items-center gap-0.5">
                        <Zap className="w-2.5 h-2.5" /> SOP loaded
                      </span>
                    )}
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(CATEGORY_LABEL_FULL).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {[
                      { v: "LOW", label: "Low" },
                      { v: "MEDIUM", label: "Medium" },
                      { v: "HIGH", label: "High" },
                      { v: "URGENT", label: "Urgent" },
                    ].map(({ v, label }) => <option key={v} value={v}>{label}</option>)}
                  </select>
                </div>
              </div>

              {/* Assignee + Due date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Assign To</label>
                  <select
                    value={form.assigneeId}
                    onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role.name.replace(/_/g, " ")})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Subtasks */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-400">
                    Subtasks / Checklist
                    {sops.find(s => s.category === form.category) && (
                      <span className="ml-1.5 text-indigo-400 text-[10px]">(auto-loaded from SOP)</span>
                    )}
                  </label>
                  <button
                    onClick={() => setForm({ ...form, subtasks: [...form.subtasks, ""] })}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> Add step
                  </button>
                </div>
                <div className="space-y-2">
                  {form.subtasks.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border border-gray-600 shrink-0" />
                      <input
                        value={s}
                        onChange={(e) => {
                          const updated = [...form.subtasks];
                          updated[i] = e.target.value;
                          setForm({ ...form, subtasks: updated });
                        }}
                        className="flex-1 px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder={`Step ${i + 1}`}
                      />
                      {form.subtasks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, subtasks: form.subtasks.filter((_, idx) => idx !== i) })}
                          aria-label={`Remove step ${i + 1}`}
                          className="text-gray-600 hover:text-red-400 text-xs"
                        >✕</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
              <button
                onClick={() => setCreating(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => create.mutate({ ...form, subtasks: form.subtasks.filter(Boolean) })}
                disabled={!form.title.trim() || create.isPending}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {create.isPending ? "Adding..." : "Add Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  );
}

function StatBox({ icon, label, value, danger }: { icon: React.ReactNode; label: string; value: string | number; danger?: boolean }) {
  return (
    <div className={`bg-gray-900 border rounded-xl px-4 py-3 flex items-center gap-3 ${danger ? "border-red-500/30" : "border-gray-800"}`}>
      {icon}
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-sm font-bold ${danger ? "text-red-400" : "text-white"}`}>{value}</p>
      </div>
    </div>
  );
}
