"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Plus, AlertTriangle, ChevronDown, Filter } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { formatDate, isOverdue } from "@/lib/utils";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  description?: string;
  category: string;
  priority: string;
  status: string;
  dueDate?: string;
  recurrence?: string;
  assignee?: { id: string; name: string };
  project?: { name: string; client: { name: string } };
  _count: { comments: number; files: number; subtasks: number };
};

const STATUS_COLS = [
  { key: "TODO", label: "To Do", color: "border-gray-600" },
  { key: "IN_PROGRESS", label: "In Progress", color: "border-blue-500" },
  { key: "IN_REVIEW", label: "In Review", color: "border-yellow-500" },
  { key: "CLIENT_APPROVAL", label: "Client Approval", color: "border-purple-500" },
  { key: "REVISION", label: "Revision", color: "border-orange-500" },
  { key: "DONE", label: "Done", color: "border-green-500" },
];

const STATUS_OPTIONS = ["TODO","IN_PROGRESS","IN_REVIEW","CLIENT_APPROVAL","REVISION","DONE"];
const STATUS_LABEL: Record<string,string> = {
  TODO:"To Do",IN_PROGRESS:"In Progress",IN_REVIEW:"In Review",
  CLIENT_APPROVAL:"Client Approval",REVISION:"Revision",DONE:"Done"
};

const PRIORITY_DOT: Record<string, string> = {
  LOW: "bg-gray-500", MEDIUM: "bg-blue-500", HIGH: "bg-orange-500", URGENT: "bg-red-500",
};

const CATEGORY_LABEL: Record<string, string> = {
  VIDEO_EDITING: "Video", GRAPHIC_DESIGN: "Design", ADS_MANAGEMENT: "Ads",
  SHOOT: "Shoot", CONTENT_WRITING: "Content", STRATEGY: "Strategy",
  REPORTING: "Reports", OTHER: "Other",
};

const RECURRENCE_ICON: Record<string, string> = {
  DAILY: "↻D", WEEKLY: "↻W", MONTHLY: "↻M",
};

// Draggable task card
function TaskCard({ task, onOpen, onStatusChange }: {
  task: Task;
  onOpen: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const [statusOpen, setStatusOpen] = useState(false);
  const late = task.dueDate && isOverdue(task.dueDate) && task.status !== "DONE";

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div
        className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors cursor-pointer"
        onClick={() => onOpen(task.id)}
        {...attributes}
        {...listeners}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
            {CATEGORY_LABEL[task.category]}
          </span>
          <div className="flex items-center gap-1.5">
            {task.recurrence && task.recurrence !== "NONE" && (
              <span className="text-[10px] text-indigo-400 font-bold">{RECURRENCE_ICON[task.recurrence]}</span>
            )}
            <div className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority]}`} />
          </div>
        </div>
        <p className="text-sm font-medium text-white mb-2">{task.title}</p>
        {task.project && (
          <p className="text-xs text-gray-500 mb-2">{task.project.client.name} · {task.project.name}</p>
        )}
        {task._count.subtasks > 0 && (
          <p className="text-[11px] text-gray-600 mb-2">
            {task._count.subtasks} subtasks · {task._count.comments} comments
          </p>
        )}
        <div className="flex items-center justify-between mt-3">
          {task.assignee ? (
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white">
                {task.assignee.name.charAt(0)}
              </div>
              <span className="text-xs text-gray-400">{task.assignee.name.split(" ")[0]}</span>
            </div>
          ) : (
            <span className="text-xs text-gray-600">Unassigned</span>
          )}
          {task.dueDate && (
            <div className={`flex items-center gap-1 text-xs ${late ? "text-red-400" : "text-gray-500"}`}>
              {late && <AlertTriangle className="w-3 h-3" />}
              {formatDate(task.dueDate)}
            </div>
          )}
        </div>
      </div>

      {/* Quick status change button */}
      <div
        className="absolute top-2 right-2 hidden group-hover:block"
        onClick={(e) => { e.stopPropagation(); setStatusOpen(!statusOpen); }}
      >
        {statusOpen && (
          <div className="absolute top-full right-0 mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-20 overflow-hidden min-w-[150px]">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(task.id, s);
                  setStatusOpen(false);
                }}
                className={cn("w-full text-left px-3 py-2 text-xs hover:bg-gray-700 transition-colors",
                  s === task.status ? "text-indigo-400 font-semibold" : "text-gray-300"
                )}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TasksPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [view, setView] = useState<"board" | "list">("board");
  const [creating, setCreating] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [form, setForm] = useState({
    title: "", description: "", category: "VIDEO_EDITING", priority: "MEDIUM",
    dueDate: "", assigneeId: "", projectId: "", recurrence: "",
    subtasks: [""],
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => axios.get("/api/tasks").then((r) => r.data),
  });

  const { data: users = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["users"],
    queryFn: () => axios.get("/api/users").then((r) => r.data),
  });

  const { data: projects = [] } = useQuery<{ id: string; name: string; client: { name: string } }[]>({
    queryKey: ["projects"],
    queryFn: () => axios.get("/api/projects").then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: typeof form) => axios.post("/api/tasks", {
      ...data,
      subtasks: form.subtasks.filter(Boolean),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setCreating(false);
      setForm({ title: "", description: "", category: "VIDEO_EDITING", priority: "MEDIUM", dueDate: "", assigneeId: "", projectId: "", recurrence: "", subtasks: [""] });
      toast("Task created", "success");
    },
    onError: () => toast("Failed to create task", "error"),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      axios.patch(`/api/tasks/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: () => toast("Failed to update status", "error"),
  });

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    // over.id is the column key when dropped on a column
    const newStatus = over.id as string;
    if (STATUS_OPTIONS.includes(newStatus)) {
      const task = tasks.find((t) => t.id === active.id);
      if (task && task.status !== newStatus) {
        updateStatus.mutate({ id: active.id as string, status: newStatus });
      }
    }
  }

  const activeTask = tasks.find((t) => t.id === activeId);

  const filteredTasks = useMemo(() => tasks.filter((t) => {
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterAssignee && t.assignee?.id !== filterAssignee) return false;
    if (filterProject && t.project?.name !== filterProject) return false;
    return true;
  }), [tasks, filterPriority, filterAssignee, filterProject]);

  const byStatus = (status: string) => filteredTasks.filter((t) => t.status === status);
  const hasFilters = filterPriority || filterAssignee || filterProject;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Tasks</h1>
          <p className="text-sm text-gray-400 mt-1">{tasks.length} total tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button onClick={() => setView("board")} className={`px-3 py-1 text-xs rounded-md transition-colors ${view === "board" ? "bg-gray-700 text-white" : "text-gray-400"}`}>Board</button>
            <button onClick={() => setView("list")} className={`px-3 py-1 text-xs rounded-md transition-colors ${view === "list" ? "bg-gray-700 text-white" : "text-gray-400"}`}>List</button>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-3 md:px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Task</span>
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-gray-500 shrink-0" />
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white focus:outline-none"
        >
          <option value="">All Priorities</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white focus:outline-none"
        >
          <option value="">All Assignees</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white focus:outline-none"
        >
          <option value="">All Projects</option>
          {projects.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
        {hasFilters && (
          <button
            onClick={() => { setFilterPriority(""); setFilterAssignee(""); setFilterProject(""); }}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Clear filters
          </button>
        )}
        {hasFilters && (
          <span className="text-xs text-gray-500">{filteredTasks.length} of {tasks.length} shown</span>
        )}
      </div>

      {/* Board view with DnD */}
      {view === "board" && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STATUS_COLS.map((col) => {
              const colTasks = byStatus(col.key);
              return (
                <DroppableColumn key={col.key} col={col} tasks={colTasks} onOpen={setSelectedTaskId}
                  onStatusChange={(id, status) => updateStatus.mutate({ id, status })} />
              );
            })}
          </div>
          <DragOverlay>
            {activeTask && (
              <div className="bg-gray-900 border border-indigo-500 rounded-xl p-4 shadow-2xl w-72 opacity-90">
                <p className="text-sm font-medium text-white">{activeTask.title}</p>
                <p className="text-xs text-gray-500 mt-1">{CATEGORY_LABEL[activeTask.category]}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* List view */}
      {view === "list" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs text-gray-400 px-5 py-3">Task</th>
                <th className="text-left text-xs text-gray-400 px-3 py-3">Category</th>
                <th className="text-left text-xs text-gray-400 px-3 py-3">Assignee</th>
                <th className="text-left text-xs text-gray-400 px-3 py-3">Priority</th>
                <th className="text-left text-xs text-gray-400 px-3 py-3">Status</th>
                <th className="text-left text-xs text-gray-400 px-3 py-3">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {tasks.map((task) => (
                <tr key={task.id} onClick={() => setSelectedTaskId(task.id)} className="hover:bg-gray-800/50 transition-colors cursor-pointer">
                  <td className="px-5 py-3">
                    <p className="text-sm text-white">{task.title}</p>
                    {task.project && <p className="text-xs text-gray-500">{task.project.client.name}</p>}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-400">{CATEGORY_LABEL[task.category]}</td>
                  <td className="px-3 py-3 text-xs text-gray-400">{task.assignee?.name ?? "—"}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[task.priority]}`} />
                      <span className="text-xs text-gray-400">{task.priority}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <select
                      value={task.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateStatus.mutate({ id: task.id, status: e.target.value })}
                      className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-300"
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                  </td>
                  <td className={`px-3 py-3 text-xs ${task.dueDate && isOverdue(task.dueDate) && task.status !== "DONE" ? "text-red-400" : "text-gray-400"}`}>
                    {task.dueDate ? formatDate(task.dueDate) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create task modal */}
      {creating && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-800 shrink-0">
              <h2 className="text-lg font-semibold text-white">Create Task</h2>
              <button onClick={() => setCreating(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Title *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Task title" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {["LOW","MEDIUM","HIGH","URGENT"].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Recurrence</label>
                  <select value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">No recurrence</option>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Due date</label>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Project (optional)</label>
                <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">No project</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.client.name} — {p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Assign to</label>
                <select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Unassigned</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              {/* Subtasks */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Subtasks / Checklist</label>
                {form.subtasks.map((s, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input value={s} onChange={(e) => {
                      const updated = [...form.subtasks];
                      updated[i] = e.target.value;
                      setForm({ ...form, subtasks: updated });
                    }}
                      className="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder={`Step ${i + 1}`} />
                    {form.subtasks.length > 1 && (
                      <button onClick={() => setForm({ ...form, subtasks: form.subtasks.filter((_, j) => j !== i) })}
                        className="text-gray-500 hover:text-red-400 px-2">✕</button>
                    )}
                  </div>
                ))}
                <button onClick={() => setForm({ ...form, subtasks: [...form.subtasks, ""] })}
                  className="text-xs text-indigo-400 hover:text-indigo-300 mt-1">+ Add step</button>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800 shrink-0">
              <button onClick={() => setCreating(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
              <button onClick={() => create.mutate(form)} disabled={!form.title || create.isPending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                {create.isPending ? "Creating..." : "Create Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task detail modal */}
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={() => qc.invalidateQueries({ queryKey: ["tasks"] })}
        />
      )}
    </div>
  );
}

function DroppableColumn({ col, tasks, onOpen, onStatusChange }: {
  col: { key: string; label: string; color: string };
  tasks: Task[];
  onOpen: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });

  return (
    <div
      ref={setNodeRef}
      id={col.key}
      className={cn("flex-shrink-0 w-72 rounded-xl transition-colors", isOver && "bg-gray-800/30")}
    >
      <div className={`flex items-center gap-2 mb-3 pb-2 border-b-2 ${col.color}`}>
        <span className="text-xs font-semibold text-white">{col.label}</span>
        <span className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded-full">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy} id={col.key}>
        <div className="space-y-2 min-h-[60px]">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={onOpen} onStatusChange={onStatusChange} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
