"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { CheckCircle2, RotateCcw, FileText, MessageSquare, Clock, CheckSquare } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { CATEGORY_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { inputClass } from "@/components/ui/Input";

type Task = {
  id: string;
  title: string;
  description?: string;
  status: string;
  category: string;
  revisionNo: number;
  maxRevisions: number;
  dueDate?: string;
  assignee?: { name: string };
  files: { id: string; name: string; mimeType: string }[];
  _count: { comments: number };
  project?: { name: string };
};

type Project = { id: string; name: string; tasks: Task[] };

export default function ApprovalsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [feedback, setFeedback] = useState("");
  const [action, setAction] = useState<"approve" | "revision" | null>(null);

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["portal-projects"],
    queryFn: () => axios.get("/api/portal/projects").then((r) => r.data),
  });

  const allTasks = projects.flatMap((p) => p.tasks.map((t) => ({ ...t, project: { name: p.name } })));
  const pendingApproval = allTasks.filter((t) => t.status === "CLIENT_APPROVAL");
  const recentlyDone = allTasks.filter((t) => t.status === "DONE").slice(0, 5);

  const submit = useMutation({
    mutationFn: ({ taskId, action, feedback }: { taskId: string; action: string; feedback: string }) =>
      axios.patch("/api/portal/tasks", { taskId, action, feedback }),
    onSuccess: (_, { action: act }) => {
      qc.invalidateQueries({ queryKey: ["portal-projects"] });
      setActiveTask(null);
      setFeedback("");
      setAction(null);
      toast(act === "approve" ? "Deliverable approved" : "Revision requested", "success");
    },
    onError: () => toast("Something went wrong — try again", "error"),
  });

  function openTask(task: Task, act: "approve" | "revision") {
    setActiveTask(task);
    setAction(act);
    setFeedback("");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-white">Approvals</h1>
        <p className="mt-1 text-sm text-gray-500">Review and sign off on deliverables.</p>
      </div>

      {/* Pending */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-500" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-white">Awaiting your approval</h2>
          {pendingApproval.length > 0 && (
            <span className="rounded-full bg-purple-400/12 px-2 py-0.5 text-xs text-purple-400 tabular-nums">
              {pendingApproval.length}
            </span>
          )}
        </div>

        {pendingApproval.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-800 bg-gray-900/40 py-12 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-green-500/50" aria-hidden="true" />
            <p className="text-sm font-medium text-gray-300">All caught up</p>
            <p className="mt-1 text-xs text-gray-600">Nothing waiting on you right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingApproval.map((task) => (
              <div key={task.id} className="rounded-xl border border-purple-500/20 bg-gray-900 p-4">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <Badge>{CATEGORY_LABEL[task.category] ?? task.category}</Badge>
                      <span className="text-xs text-gray-500">{task.project?.name}</span>
                      {task.revisionNo > 0 && (
                        <Badge tone="warning">Rev {task.revisionNo}/{task.maxRevisions}</Badge>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-white">{task.title}</h3>
                    {task.description && <p className="mt-1 text-xs text-gray-400">{task.description}</p>}
                  </div>
                  {task.assignee && (
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] text-gray-500">Delivered by</p>
                      <p className="text-xs font-medium text-white">{task.assignee.name}</p>
                    </div>
                  )}
                </div>

                {task.files.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {task.files.map((file) => (
                      <a
                        key={file.id}
                        href={`/api/files/${file.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-lg border border-gray-800 bg-gray-950/50 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:border-gray-700 hover:text-white"
                      >
                        <FileText className="h-3 w-3 text-gray-500" aria-hidden="true" />
                        {file.name}
                      </a>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="primary" onClick={() => openTask(task, "approve")} className="bg-green-600 hover:bg-green-500">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Approve
                  </Button>
                  {task.revisionNo < task.maxRevisions ? (
                    <Button size="sm" variant="secondary" onClick={() => openTask(task, "revision")}>
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Request revision
                    </Button>
                  ) : (
                    <span className="text-xs text-gray-500">Revision limit reached — contact your team directly</span>
                  )}
                  {task._count.comments > 0 && (
                    <span className="ml-auto flex items-center gap-1 text-xs text-gray-500" aria-label={`${task._count.comments} comments`}>
                      <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                      {task._count.comments}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recently approved */}
      {recentlyDone.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-gray-500" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-white">Recently approved</h2>
          </div>
          <div className="divide-y divide-gray-800/60 rounded-xl border border-gray-800 bg-gray-900">
            {recentlyDone.map((task) => (
              <div key={task.id} className="flex items-center gap-3 px-5 py-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-gray-100">{task.title}</p>
                  <p className="text-xs text-gray-500">{task.project?.name}</p>
                </div>
                <span className="shrink-0 text-xs text-green-400">Approved</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTask && action && (
        <Modal
          title={action === "approve" ? "Approve deliverable" : "Request revision"}
          onClose={() => setActiveTask(null)}
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setActiveTask(null)}>Cancel</Button>
              <Button
                size="sm"
                variant={action === "approve" ? "primary" : "secondary"}
                className={action === "approve" ? "bg-green-600 hover:bg-green-500" : undefined}
                loading={submit.isPending}
                disabled={action === "revision" && !feedback.trim()}
                onClick={() => submit.mutate({ taskId: activeTask.id, action, feedback })}
              >
                {action === "approve" ? "Confirm approval" : "Send revision"}
              </Button>
            </>
          }
        >
          <p className="-mt-1 truncate text-xs text-gray-500">{activeTask.title}</p>
          <div>
            <label htmlFor="fb" className="mb-1.5 block text-xs font-medium text-gray-400">
              {action === "approve" ? "Any comments? (optional)" : "What needs to change?"}
            </label>
            <textarea
              id="fb"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              className={cn(inputClass, "resize-none")}
              placeholder={action === "approve" ? "Looks great! …" : "Please adjust the colour scheme to match our brand…"}
            />
          </div>
          {action === "revision" && activeTask.revisionNo >= activeTask.maxRevisions - 1 && (
            <p className="rounded-lg border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-xs text-orange-400">
              This is your last revision ({activeTask.maxRevisions} max) — please be specific.
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
