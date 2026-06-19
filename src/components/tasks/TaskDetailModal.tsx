"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  X, Clock, User, Calendar, CheckSquare, ChevronDown,
  Send, Trash2, AlertTriangle, RefreshCw, Pencil, Check,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { formatDate, isOverdue } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "TODO", label: "To Do", color: "bg-gray-700 text-gray-300" },
  { value: "IN_PROGRESS", label: "In Progress", color: "bg-blue-500/20 text-blue-400" },
  { value: "IN_REVIEW", label: "In Review", color: "bg-yellow-500/20 text-yellow-400" },
  { value: "CLIENT_APPROVAL", label: "Client Approval", color: "bg-purple-500/20 text-purple-400" },
  { value: "REVISION", label: "Revision", color: "bg-orange-500/20 text-orange-400" },
  { value: "DONE", label: "Done", color: "bg-green-500/20 text-green-400" },
];

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low", dot: "bg-gray-500" },
  { value: "MEDIUM", label: "Medium", dot: "bg-blue-500" },
  { value: "HIGH", label: "High", dot: "bg-orange-500" },
  { value: "URGENT", label: "Urgent", dot: "bg-red-500" },
];

const RECURRENCE_OPTIONS = [
  { value: "", label: "No recurrence" },
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
];

const CATEGORY_LABEL: Record<string, string> = {
  VIDEO_EDITING: "Video Editing", GRAPHIC_DESIGN: "Graphic Design",
  ADS_MANAGEMENT: "Ads Management", SHOOT: "Shoot",
  CONTENT_WRITING: "Content Writing", STRATEGY: "Strategy",
  REPORTING: "Reporting", OTHER: "Other",
};

type Task = {
  id: string; title: string; description?: string; status: string;
  category: string; priority: string; dueDate?: string; recurrence?: string;
  completedAt?: string;
  assignee?: { id: string; name: string };
  creator: { id: string; name: string };
  project?: { id: string; name: string; client: { name: string } };
  subtasks: { id: string; title: string; done: boolean }[];
  comments: { id: string; body: string; createdAt: string; author: { id: string; name: string } }[];
  _count: { comments: number; files: number; subtasks: number };
};

export function TaskDetailModal({ taskId, onClose, onUpdate }: {
  taskId: string;
  onClose: () => void;
  onUpdate?: (task: Task) => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [comment, setComment] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [editDesc, setEditDesc] = useState("");

  const { data: task, isLoading } = useQuery<Task>({
    queryKey: ["task", taskId],
    queryFn: () => axios.get(`/api/tasks/${taskId}`).then((r) => r.data),
  });

  const updateTask = useMutation({
    mutationFn: (data: Record<string, unknown>) => axios.patch(`/api/tasks/${taskId}`, data).then(r => r.data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["task", taskId] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast("Task updated");
      onUpdate?.(updated);
    },
    onError: () => toast("Failed to update task", "error"),
  });

  const toggleSubtask = useMutation({
    mutationFn: ({ subtaskId, done }: { subtaskId: string; done: boolean }) =>
      axios.patch(`/api/tasks/${taskId}/subtasks`, { subtaskId, done }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["task", taskId] }),
  });

  const addComment = useMutation({
    mutationFn: () => axios.post(`/api/tasks/${taskId}/comments`, { body: comment }),
    onSuccess: () => {
      setComment("");
      qc.invalidateQueries({ queryKey: ["task", taskId] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: () => axios.delete(`/api/tasks/${taskId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
    },
  });

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (isLoading || !task) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statusCfg = STATUS_OPTIONS.find((s) => s.value === task.status)!;
  const priCfg = PRIORITY_OPTIONS.find((p) => p.value === task.priority)!;
  const doneSubtasks = task.subtasks.filter((s) => s.done).length;
  const sopPct = task.subtasks.length ? Math.round((doneSubtasks / task.subtasks.length) * 100) : null;
  const late = task.dueDate && isOverdue(task.dueDate) && task.status !== "DONE";

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-800 shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                {CATEGORY_LABEL[task.category]}
              </span>
              {task.project && (
                <span className="text-xs text-indigo-400">{task.project.client.name} · {task.project.name}</span>
              )}
            </div>
            {editingTitle ? (
              <input
                autoFocus
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editTitle.trim()) {
                    updateTask.mutate({ title: editTitle.trim() });
                    setEditingTitle(false);
                  }
                  if (e.key === "Escape") setEditingTitle(false);
                }}
                onBlur={() => {
                  if (editTitle.trim() && editTitle.trim() !== task.title) {
                    updateTask.mutate({ title: editTitle.trim() });
                  }
                  setEditingTitle(false);
                }}
                className="text-lg font-semibold text-white bg-gray-800 border border-indigo-500 rounded-lg px-2 py-0.5 w-full focus:outline-none"
              />
            ) : (
              <button
                onClick={() => { setEditTitle(task.title); setEditingTitle(true); }}
                className="flex items-center gap-1.5 group/title text-left"
              >
                <h2 className="text-lg font-semibold text-white leading-snug">{task.title}</h2>
                <Pencil className="w-3.5 h-3.5 text-gray-600 opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0 mt-0.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => { if (confirm("Delete this task?")) deleteTask.mutate(); }}
              className="p-1.5 text-gray-600 hover:text-red-400 transition-colors rounded-lg hover:bg-gray-800"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">
            {/* Status + Priority row */}
            <div className="flex flex-wrap gap-3">
              {/* Status picker */}
              <div className="relative">
                <button
                  onClick={() => setStatusOpen(!statusOpen)}
                  className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors", statusCfg.color)}
                >
                  {statusCfg.label}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {statusOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-10 overflow-hidden min-w-[160px]">
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => { updateTask.mutate({ status: s.value }); setStatusOpen(false); }}
                        className={cn("w-full text-left px-3 py-2 text-sm transition-colors hover:bg-gray-700", s.color)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Priority picker */}
              <select
                value={task.priority}
                onChange={(e) => updateTask.mutate({ priority: e.target.value })}
                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>

              {/* Recurrence */}
              <select
                value={task.recurrence || ""}
                onChange={(e) => updateTask.mutate({ recurrence: e.target.value || null })}
                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
              >
                {RECURRENCE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Meta row */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <User className="w-3.5 h-3.5 shrink-0" />
                <span>{task.assignee?.name ?? "Unassigned"}</span>
              </div>
              <div className={cn("flex items-center gap-2", late ? "text-red-400" : "text-gray-400")}>
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>{task.dueDate ? formatDate(task.dueDate) : "No due date"}</span>
                {late && <AlertTriangle className="w-3.5 h-3.5" />}
              </div>
              {task.recurrence && task.recurrence !== "NONE" && (
                <div className="flex items-center gap-2 text-indigo-400">
                  <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                  <span>Repeats {task.recurrence.toLowerCase()}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-500 text-xs">
                <span>Created by {task.creator.name}</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Description</p>
                {!editingDesc && (
                  <button
                    onClick={() => { setEditDesc(task.description || ""); setEditingDesc(true); }}
                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-400 transition-colors"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                )}
              </div>
              {editingDesc ? (
                <div className="space-y-2">
                  <textarea
                    autoFocus
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-800 border border-indigo-500 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none resize-none"
                    placeholder="Add a description..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        updateTask.mutate({ description: editDesc.trim() || null });
                        setEditingDesc(false);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition-colors"
                    >
                      <Check className="w-3 h-3" /> Save
                    </button>
                    <button
                      onClick={() => setEditingDesc(false)}
                      className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className={task.description ? "text-sm text-gray-300 leading-relaxed" : "text-sm text-gray-600 italic"}>
                  {task.description || "No description. Click Edit to add one."}
                </p>
              )}
            </div>

            {/* Subtasks / SOP checklist */}
            {task.subtasks.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    SOP Checklist
                  </p>
                  {sopPct !== null && (
                    <span className={cn("text-xs font-semibold", sopPct === 100 ? "text-green-400" : sopPct >= 50 ? "text-yellow-400" : "text-gray-400")}>
                      {sopPct}% complete
                    </span>
                  )}
                </div>
                {sopPct !== null && (
                  <div className="h-1.5 bg-gray-800 rounded-full mb-3 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", sopPct === 100 ? "bg-green-500" : "bg-indigo-500")}
                      style={{ width: `${sopPct}%` }}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  {task.subtasks.map((sub) => (
                    <label key={sub.id} className="flex items-start gap-3 cursor-pointer group">
                      <button
                        onClick={() => toggleSubtask.mutate({ subtaskId: sub.id, done: !sub.done })}
                        className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                          sub.done ? "bg-indigo-500 border-indigo-500" : "border-gray-600 group-hover:border-gray-400"
                        )}
                      >
                        {sub.done && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </button>
                      <span className={cn("text-sm", sub.done ? "line-through text-gray-600" : "text-gray-300")}>
                        {sub.title}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-3">
                Comments ({task.comments.length})
              </p>
              {task.comments.length > 0 && (
                <div className="space-y-3 mb-4">
                  {task.comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5">
                        {c.author.name.charAt(0)}
                      </div>
                      <div className="flex-1 bg-gray-800 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-white">{c.author.name}</span>
                          <span className="text-[10px] text-gray-500">
                            {new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300">{c.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {task.comments.length === 0 && (
                <p className="text-sm text-gray-600 text-center py-3">No comments yet. Be the first!</p>
              )}
            </div>
          </div>
        </div>

        {/* Comment input — sticky at bottom */}
        <div className="p-4 border-t border-gray-800 shrink-0">
          <div className="flex gap-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && comment.trim()) { e.preventDefault(); addComment.mutate(); } }}
              placeholder="Add a comment… (Enter to send)"
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => comment.trim() && addComment.mutate()}
              disabled={!comment.trim() || addComment.isPending}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
