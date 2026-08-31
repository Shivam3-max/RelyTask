"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { usePageTitle } from "@/lib/hooks";
import axios from "axios";
import { Plus, AlertTriangle, Filter } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { inputClass } from "@/components/ui/Input";
import { formatDate, isOverdue } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";
import {
  STATUS_COLS, STATUS_OPTIONS, STATUS_LABEL,
  PRIORITY_DOT, CATEGORY_LABEL, RECURRENCE_ICON,
} from "@/lib/constants";
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
        className="cursor-pointer rounded-lg border border-gray-800 bg-gray-900 p-3 transition-colors hover:border-gray-700"
        onClick={() => onOpen(task.id)}
        aria-label={`${task.title} — drag to move between columns`}
        {...attributes}
        {...listeners}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <Badge>{CATEGORY_LABEL[task.category]}</Badge>
          <div className="flex items-center gap-1.5 pt-0.5">
            {task.recurrence && task.recurrence !== "NONE" && (
              <span className="text-[10px] font-bold text-indigo-400">{RECURRENCE_ICON[task.recurrence]}</span>
            )}
            <span className={`h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`} aria-hidden="true" />
          </div>
        </div>
        <p className="text-[13px] font-medium leading-snug text-gray-100">{task.title}</p>
        {task.project && (
          <p className="mt-1.5 truncate text-xs text-gray-500">{task.project.client.name} · {task.project.name}</p>
        )}
        {task._count.subtasks > 0 && (
          <p className="mt-1.5 text-[11px] text-gray-600">
            {task._count.subtasks} subtasks · {task._count.comments} comments
          </p>
        )}
        <div className="mt-3 flex items-center justify-between">
          {task.assignee ? (
            <span className="flex items-center gap-1.5">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-gray-800 text-[10px] font-semibold text-gray-200">
                {task.assignee.name.charAt(0)}
              </span>
              <span className="text-xs text-gray-400">{task.assignee.name.split(" ")[0]}</span>
            </span>
          ) : (
            <span className="text-xs text-gray-600">Unassigned</span>
          )}
          {task.dueDate && (
            <span className={`flex items-center gap-1 text-xs tabular-nums ${late ? "text-red-400" : "text-gray-500"}`}>
              {late && <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
              {formatDate(task.dueDate)}
            </span>
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
  usePageTitle("Tasks");
  const { data: session } = useSession();
  const canCreateTask = !!session && hasPermission(session, "tasks", "create");
  const qc = useQueryClient();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [view, setView] = useState<"board" | "list">("board");
  const [creating, setCreating] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(searchParams.get("task"));
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
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const prev = qc.getQueryData<Task[]>(["tasks"]);
      qc.setQueryData<Task[]>(["tasks"], (old) =>
        old?.map((t) => (t.id === id ? { ...t, status } : t)) ?? []
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["tasks"], ctx.prev);
      toast("Failed to update status", "error");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
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
    if ((STATUS_OPTIONS as readonly string[]).includes(newStatus)) {
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

  const selectClass = "h-8 rounded-lg border border-gray-800 bg-gray-900 px-2.5 text-xs text-gray-200 focus:border-indigo-500 focus:outline-none";

  return (
    <div className="space-y-5">
      <PageHeader title="Tasks" description={`${tasks.length} across the board`}>
        <div className="flex rounded-lg border border-gray-800 bg-gray-900 p-0.5">
          {(["board", "list"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                view === v ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300"
              )}
            >
              {v}
            </button>
          ))}
        </div>
        {canCreateTask && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New task</span>
          </Button>
        )}
      </PageHeader>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 shrink-0 text-gray-600" aria-hidden="true" />
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className={selectClass}>
          <option value="">All priorities</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} className={selectClass}>
          <option value="">All assignees</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className={selectClass}>
          <option value="">All projects</option>
          {projects.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
        {hasFilters && (
          <>
            <button
              onClick={() => { setFilterPriority(""); setFilterAssignee(""); setFilterProject(""); }}
              className="text-xs text-gray-400 transition-colors hover:text-white"
            >
              Clear
            </button>
            <span className="text-xs text-gray-600">{filteredTasks.length} of {tasks.length}</span>
          </>
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
        <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-[11px] font-medium uppercase tracking-wide text-gray-600">
                <th className="px-5 py-2.5">Task</th>
                <th className="px-3 py-2.5">Category</th>
                <th className="px-3 py-2.5">Assignee</th>
                <th className="px-3 py-2.5">Priority</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/70">
              {filteredTasks.map((task) => (
                <tr key={task.id} onClick={() => setSelectedTaskId(task.id)} className="cursor-pointer transition-colors hover:bg-gray-800/40">
                  <td className="px-5 py-3">
                    <p className="text-[13px] text-gray-100">{task.title}</p>
                    {task.project && <p className="text-xs text-gray-500">{task.project.client.name}</p>}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-400">{CATEGORY_LABEL[task.category]}</td>
                  <td className="px-3 py-3 text-xs text-gray-400">{task.assignee?.name ?? "—"}</td>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[task.priority]}`} />
                      <span className="text-xs capitalize text-gray-400">{task.priority.toLowerCase()}</span>
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <select
                      value={task.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateStatus.mutate({ id: task.id, status: e.target.value })}
                      className="rounded-md border border-gray-800 bg-gray-900 px-2 py-1 text-xs text-gray-300 focus:border-indigo-500 focus:outline-none"
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
        <Modal
          title="Create task"
          size="lg"
          onClose={() => setCreating(false)}
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>Cancel</Button>
              <Button size="sm" onClick={() => create.mutate(form)} loading={create.isPending} disabled={!form.title}>
                Create task
              </Button>
            </>
          }
        >
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Title *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={inputClass}
                  placeholder="Task title" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2} className={cn(inputClass, "resize-none")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className={inputClass}>
                    {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className={inputClass}>
                    {["LOW","MEDIUM","HIGH","URGENT"].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Recurrence</label>
                  <select value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value })}
                    className={inputClass}>
                    <option value="">No recurrence</option>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Due date</label>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Project (optional)</label>
                <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                  className={inputClass}>
                  <option value="">No project</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.client.name} — {p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Assign to</label>
                <select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                  className={inputClass}>
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
                      className={cn(inputClass, "flex-1")}
                      placeholder={`Step ${i + 1}`} />
                    {form.subtasks.length > 1 && (
                      <button type="button" onClick={() => setForm({ ...form, subtasks: form.subtasks.filter((_, j) => j !== i) })}
                        aria-label={`Remove step ${i + 1}`} className="text-gray-500 hover:text-red-400 px-2">✕</button>
                    )}
                  </div>
                ))}
                <button onClick={() => setForm({ ...form, subtasks: [...form.subtasks, ""] })}
                  className="mt-1 text-xs text-gray-400 transition-colors hover:text-white">+ Add step</button>
              </div>
        </Modal>
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

// Tailwind needs literal class names — map each column's border-* token to a bg dot.
const COLUMN_DOT: Record<string, string> = {
  "border-gray-600": "bg-gray-500",
  "border-blue-500": "bg-blue-400",
  "border-yellow-500": "bg-yellow-400",
  "border-purple-500": "bg-purple-400",
  "border-orange-500": "bg-orange-400",
  "border-green-500": "bg-green-400",
};

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
      <div className="mb-3 flex items-center gap-2 border-b border-gray-800 pb-2">
        <span className={`h-2 w-2 rounded-full ${COLUMN_DOT[col.color] ?? "bg-gray-500"}`} aria-hidden="true" />
        <span className="text-xs font-semibold text-gray-200">{col.label}</span>
        <span className="rounded-full bg-gray-800 px-1.5 text-[11px] tabular-nums text-gray-400">{tasks.length}</span>
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
