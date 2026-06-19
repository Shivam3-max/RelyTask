"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { CheckCircle, RotateCcw, FileText, MessageSquare, Clock, CheckSquare } from "lucide-react";

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
  files: { id: string; name: string; url: string; mimeType: string }[];
  _count: { comments: number };
  project?: { name: string };
};

type Project = { id: string; name: string; tasks: Task[] };

const CATEGORY_LABEL: Record<string, string> = {
  VIDEO_EDITING: "Video", GRAPHIC_DESIGN: "Design", ADS_MANAGEMENT: "Ads",
  SHOOT: "Shoot", CONTENT_WRITING: "Content", STRATEGY: "Strategy",
  REPORTING: "Reports", OTHER: "Other",
};

export default function ApprovalsPage() {
  const qc = useQueryClient();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [feedback, setFeedback] = useState("");
  const [action, setAction] = useState<"approve" | "revision" | null>(null);

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["portal-projects"],
    queryFn: () => axios.get("/api/portal/projects").then((r) => r.data),
  });

  const allTasks = projects.flatMap((p) =>
    p.tasks.map((t) => ({ ...t, project: { name: p.name } }))
  );
  const pendingApproval = allTasks.filter((t) => t.status === "CLIENT_APPROVAL");
  const recentlyDone = allTasks.filter((t) => t.status === "DONE").slice(0, 5);

  const submit = useMutation({
    mutationFn: ({ taskId, action, feedback }: { taskId: string; action: string; feedback: string }) =>
      axios.patch("/api/portal/tasks", { taskId, action, feedback }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-projects"] });
      setActiveTask(null);
      setFeedback("");
      setAction(null);
    },
  });

  function openTask(task: Task, act: "approve" | "revision") {
    setActiveTask(task);
    setAction(act);
    setFeedback("");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Approvals</h1>
        <p className="text-sm text-gray-400 mt-1">Review and approve deliverables from your agency</p>
      </div>

      {/* Pending */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-semibold text-white">Awaiting Your Approval</h2>
          {pendingApproval.length > 0 && (
            <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
              {pendingApproval.length}
            </span>
          )}
        </div>

        {pendingApproval.length === 0 ? (
          <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-xl">
            <CheckCircle className="w-8 h-8 text-green-500/50 mx-auto mb-3" />
            <p className="text-sm text-gray-400 font-medium">All caught up!</p>
            <p className="text-xs text-gray-600 mt-1">No deliverables waiting for your approval</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingApproval.map((task) => (
              <div key={task.id} className="bg-gray-900 border border-purple-500/20 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                        {CATEGORY_LABEL[task.category] ?? task.category}
                      </span>
                      <span className="text-xs text-gray-600">{task.project?.name}</span>
                      {task.revisionNo > 0 && (
                        <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">
                          Rev {task.revisionNo}/{task.maxRevisions}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-white">{task.title}</h3>
                    {task.description && (
                      <p className="text-xs text-gray-400 mt-1">{task.description}</p>
                    )}
                  </div>
                  {task.assignee && (
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-gray-500">Delivered by</p>
                      <p className="text-xs text-white font-medium">{task.assignee.name}</p>
                    </div>
                  )}
                </div>

                {/* Files */}
                {task.files.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {task.files.map((file) => (
                      <a
                        key={file.id}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs text-gray-300 transition-colors"
                      >
                        <FileText className="w-3 h-3 text-indigo-400" />
                        {file.name}
                      </a>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => openTask(task, "approve")}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => openTask(task, "revision")}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 text-orange-400 text-sm font-medium rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Request Revision
                  </button>
                  {task._count.comments > 0 && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 ml-auto">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {task._count.comments}
                    </div>
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
          <div className="flex items-center gap-2 mb-4">
            <CheckSquare className="w-4 h-4 text-green-400" />
            <h2 className="text-sm font-semibold text-white">Recently Approved</h2>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
            {recentlyDone.map((task) => (
              <div key={task.id} className="flex items-center gap-3 px-5 py-3.5">
                <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{task.title}</p>
                  <p className="text-xs text-gray-500">{task.project?.name}</p>
                </div>
                <span className="text-xs text-green-400 shrink-0">Approved</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {activeTask && action && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">
                {action === "approve" ? "Approve Deliverable" : "Request Revision"}
              </h2>
              <p className="text-sm text-gray-400 mt-1 truncate">{activeTask.title}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  {action === "approve" ? "Any comments? (optional)" : "What needs to change? *"}
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder={
                    action === "approve"
                      ? "Looks great! / Any notes..."
                      : "Please change the color scheme to match our brand..."
                  }
                />
              </div>
              {action === "revision" && activeTask.revisionNo >= activeTask.maxRevisions - 1 && (
                <p className="text-xs text-orange-400 bg-orange-500/10 px-3 py-2 rounded-lg">
                  Warning: This is your last revision ({activeTask.maxRevisions} max). Please be specific.
                </p>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
              <button
                onClick={() => setActiveTask(null)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  submit.mutate({ taskId: activeTask.id, action, feedback })
                }
                disabled={action === "revision" && !feedback.trim() || submit.isPending}
                className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                  action === "approve"
                    ? "bg-green-600 hover:bg-green-500"
                    : "bg-orange-600 hover:bg-orange-500"
                }`}
              >
                {submit.isPending
                  ? "Submitting..."
                  : action === "approve"
                  ? "Confirm Approval"
                  : "Send Revision"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
