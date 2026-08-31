"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import {
  ArrowLeft, Plus, CheckSquare, Calendar, CheckCircle2,
  AlertTriangle, Clock, Zap,
} from "lucide-react";
import { formatDate, isOverdue, cn } from "@/lib/utils";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { CATEGORY_LABEL_FULL, getAvatarColor, PROJECT_STATUS_COLOR } from "@/lib/constants";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { inputClass } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  TODO:            { label: "To do",           color: "text-gray-300",   bg: "bg-gray-800/80 text-gray-300", dot: "bg-gray-500" },
  IN_PROGRESS:     { label: "In progress",     color: "text-blue-400",   bg: "bg-blue-400/12 text-blue-400", dot: "bg-blue-400" },
  IN_REVIEW:       { label: "In review",       color: "text-yellow-400", bg: "bg-yellow-400/12 text-yellow-400", dot: "bg-yellow-400" },
  CLIENT_APPROVAL: { label: "Client approval", color: "text-purple-400", bg: "bg-purple-400/12 text-purple-400", dot: "bg-purple-400" },
  REVISION:        { label: "Revision",        color: "text-orange-400", bg: "bg-orange-400/12 text-orange-400", dot: "bg-orange-400" },
  DONE:            { label: "Done",            color: "text-green-400",  bg: "bg-green-400/12 text-green-400", dot: "bg-green-400" },
};

const PRIORITY_DOT: Record<string, string> = {
  LOW: "bg-gray-500", MEDIUM: "bg-blue-500", HIGH: "bg-orange-500", URGENT: "bg-red-500",
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
    mutationFn: (data: typeof form) => axios.post("/api/tasks", { ...data, projectId: project.id }),
    onSuccess: (res) => {
      setLocalTasks((prev) => [res.data, ...prev]);
      setCreating(false);
      setForm(EMPTY_FORM);
    },
  });

  function handleCategoryChange(cat: string) {
    const matchingSop = sops.find((s) => s.category === cat);
    setForm((f) => ({ ...f, category: cat, subtasks: matchingSop ? matchingSop.steps.map((s) => s.title) : [""] }));
  }

  const done = localTasks.filter((t) => t.status === "DONE").length;
  const overdue = localTasks.filter((t) => t.dueDate && isOverdue(t.dueDate) && t.status !== "DONE").length;
  const completion = localTasks.length ? Math.round((done / localTasks.length) * 100) : 0;

  const ORDER = ["TODO", "IN_PROGRESS", "IN_REVIEW", "CLIENT_APPROVAL", "REVISION", "DONE"] as const;
  const grouped = ORDER.map((s) => [s, localTasks.filter((t) => t.status === s)] as const);

  const sopLoaded = !!sops.find((s) => s.category === form.category);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/projects" className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-white">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Projects
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2.5">
              <h1 className="text-[22px] font-semibold tracking-tight text-white">{project.name}</h1>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", PROJECT_STATUS_COLOR[project.status])}>
                {project.status.replace("_", " ").toLowerCase()}
              </span>
            </div>
            <p className="text-sm text-gray-500">{project.client.companyName ?? project.client.name}</p>
            {project.description && <p className="mt-1 text-sm text-gray-400">{project.description}</p>}
          </div>
          {canCreateTask && (
            <Button size="sm" onClick={() => setCreating(true)} className="shrink-0">
              <Plus className="h-3.5 w-3.5" /> Add task
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatBox Icon={CheckSquare} label="Total tasks" value={localTasks.length} />
        <StatBox Icon={CheckCircle2} label="Completed" value={done} />
        <StatBox Icon={AlertTriangle} label="Overdue" value={overdue} danger={overdue > 0} />
        {project.dueDate && <StatBox Icon={Calendar} label="Due date" value={formatDate(project.dueDate)} />}
      </div>

      {/* Progress */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white">Project completion</span>
          <span className="text-sm font-semibold tabular-nums text-white">{completion}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-800">
          <div className="h-full rounded-full bg-indigo-500 transition-[width] duration-700 ease-out" style={{ width: `${completion}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-gray-500">{done} of {localTasks.length} tasks done</p>
      </div>

      {/* Grouped task list */}
      {localTasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks yet"
          description="Add the first task to get this project moving."
          action={canCreateTask ? "Add task" : undefined}
          onAction={canCreateTask ? () => setCreating(true) : undefined}
        />
      ) : (
        <div className="space-y-2">
          {grouped.map(([status, tasks]) => {
            if (tasks.length === 0) return null;
            const cfg = STATUS_CONFIG[status];
            return (
              <div key={status} className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
                <div className="flex items-center gap-2.5 border-b border-gray-800 px-5 py-2.5">
                  <span className={cn("h-2 w-2 rounded-full", cfg.dot)} aria-hidden="true" />
                  <span className={cn("text-xs font-semibold", cfg.color)}>{cfg.label}</span>
                  <span className="rounded-full bg-gray-800 px-1.5 text-[11px] tabular-nums text-gray-400">{tasks.length}</span>
                </div>
                <div className="divide-y divide-gray-800/60">
                  {tasks.map((task) => {
                    const late = task.dueDate && isOverdue(task.dueDate) && task.status !== "DONE";
                    return (
                      <div
                        key={task.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedTaskId(task.id)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedTaskId(task.id); } }}
                        aria-label={`Open task: ${task.title}`}
                        className="flex cursor-pointer items-center gap-3.5 px-5 py-3 transition-colors hover:bg-gray-800/30"
                      >
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", PRIORITY_DOT[task.priority])} title={task.priority} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-gray-100">{task.title}</p>
                          <div className="mt-0.5 flex items-center gap-3 text-[11px] text-gray-500">
                            <span>{CATEGORY_LABEL_FULL[task.category]}</span>
                            {task._count.subtasks > 0 && <span>{task._count.subtasks} subtasks</span>}
                            {task._count.comments > 0 && <span>{task._count.comments} comments</span>}
                          </div>
                        </div>
                        <div className="shrink-0">
                          {task.assignee ? (
                            <span className="flex items-center gap-1.5">
                              <span className={cn("grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold text-onblue", getAvatarColor(task.assignee.name))}>
                                {task.assignee.name.charAt(0).toUpperCase()}
                              </span>
                              <span className="hidden text-xs text-gray-400 md:block">{task.assignee.name.split(" ")[0]}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-gray-600">Unassigned</span>
                          )}
                        </div>
                        {task.dueDate && (
                          <span className={cn("hidden shrink-0 items-center gap-1 text-xs tabular-nums sm:flex", late ? "text-red-400" : "text-gray-500")}>
                            {late ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {creating && (
        <Modal
          title="Add task"
          onClose={() => setCreating(false)}
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>Cancel</Button>
              <Button
                size="sm"
                loading={create.isPending}
                disabled={!form.title.trim()}
                onClick={() => create.mutate({ ...form, subtasks: form.subtasks.filter(Boolean) })}
              >
                Add task
              </Button>
            </>
          }
        >
          <p className="-mt-1 text-xs text-gray-500">Project: {project.name}</p>

          <div>
            <label htmlFor="t-title" className="mb-1.5 block text-xs font-medium text-gray-400">Task title <span className="text-gray-600">*</span></label>
            <input id="t-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} placeholder="e.g. Edit Reel #1 — 30s cut" autoFocus />
          </div>
          <div>
            <label htmlFor="t-desc" className="mb-1.5 block text-xs font-medium text-gray-400">Description</label>
            <textarea id="t-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={cn(inputClass, "resize-none")} placeholder="Context for your team…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="t-cat" className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-400">
                Category
                {sopLoaded && <span className="inline-flex items-center gap-0.5 text-indigo-400"><Zap className="h-2.5 w-2.5" /> SOP loaded</span>}
              </label>
              <select id="t-cat" value={form.category} onChange={(e) => handleCategoryChange(e.target.value)} className={inputClass}>
                {Object.entries(CATEGORY_LABEL_FULL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="t-pri" className="mb-1.5 block text-xs font-medium text-gray-400">Priority</label>
              <select id="t-pri" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputClass}>
                {["LOW", "MEDIUM", "HIGH", "URGENT"].map((v) => <option key={v} value={v}>{v[0] + v.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="t-assignee" className="mb-1.5 block text-xs font-medium text-gray-400">Assign to</label>
              <select id="t-assignee" value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} className={inputClass}>
                <option value="">Unassigned</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role.name.replace(/_/g, " ")})</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="t-due" className="mb-1.5 block text-xs font-medium text-gray-400">Due date</label>
              <input id="t-due" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-gray-400">
                Subtasks{sopLoaded && <span className="ml-1.5 text-[10px] text-indigo-400">from SOP</span>}
              </label>
              <button onClick={() => setForm({ ...form, subtasks: [...form.subtasks, ""] })} className="flex items-center gap-0.5 text-xs text-gray-400 transition-colors hover:text-white">
                <Plus className="h-3 w-3" /> Add step
              </button>
            </div>
            <div className="space-y-2">
              {form.subtasks.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="h-4 w-4 shrink-0 rounded border border-gray-700" />
                  <input
                    value={s}
                    onChange={(e) => {
                      const updated = [...form.subtasks];
                      updated[i] = e.target.value;
                      setForm({ ...form, subtasks: updated });
                    }}
                    className={cn(inputClass, "flex-1 text-xs")}
                    placeholder={`Step ${i + 1}`}
                  />
                  {form.subtasks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, subtasks: form.subtasks.filter((_, idx) => idx !== i) })}
                      aria-label={`Remove step ${i + 1}`}
                      className="text-xs text-gray-600 transition-colors hover:text-red-400"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {selectedTaskId && (
        <TaskDetailModal taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} onUpdate={() => setSelectedTaskId(null)} />
      )}
    </div>
  );
}

function StatBox({ Icon, label, value, danger }: {
  Icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; danger?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border bg-gray-900 p-3.5", danger ? "border-red-500/30" : "border-gray-800")}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-gray-500">{label}</span>
        <Icon className={cn("h-3.5 w-3.5", danger ? "text-red-400" : "text-gray-600")} />
      </div>
      <p className={cn("mt-2 text-[19px] font-semibold tabular-nums", danger ? "text-red-400" : "text-white")}>{value}</p>
    </div>
  );
}
