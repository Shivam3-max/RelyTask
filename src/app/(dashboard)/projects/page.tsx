"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { Plus, FolderOpen, Calendar, CheckSquare } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { PROJECT_STATUS_COLOR } from "@/lib/constants";
import { usePageTitle } from "@/lib/hooks";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { inputClass } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

type Project = {
  id: string;
  name: string;
  description?: string;
  status: string;
  startDate?: string;
  dueDate?: string;
  client: { name: string };
  _count: { tasks: number };
};

type Client = { id: string; name: string };

export default function ProjectsPage() {
  usePageTitle("Projects");
  const qc = useQueryClient();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", clientId: "", startDate: "", dueDate: "" });

  const { data: projects = [], isLoading, isError } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => axios.get("/api/projects").then((r) => r.data),
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: () => axios.get("/api/clients").then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: typeof form) => axios.post("/api/projects", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      setCreating(false);
      setForm({ name: "", description: "", clientId: "", startDate: "", dueDate: "" });
      toast("Project created", "success");
    },
    onError: () => toast("Couldn't create that project", "error"),
  });

  if (isError)
    return (
      <div className="py-24 text-center">
        <p className="font-medium text-red-400">Couldn&apos;t load projects</p>
        <p className="mt-1 text-sm text-gray-500">Check your connection and refresh.</p>
      </div>
    );

  return (
    <div className="space-y-5">
      <PageHeader title="Projects" description={isLoading ? "Loading…" : `${projects.length} total`}>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New project</span>
        </Button>
      </PageHeader>

      {!isLoading && projects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No projects yet"
          description="Create a project to group its tasks and track delivery."
          action="New project"
          onAction={() => setCreating(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="block rounded-xl border border-gray-800 bg-gray-900 p-4 transition-colors hover:border-gray-700"
            >
              <div className="mb-2.5 flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <FolderOpen className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
                  <h3 className="truncate text-sm font-semibold text-white">{project.name}</h3>
                </div>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", PROJECT_STATUS_COLOR[project.status])}>
                  {project.status.replace("_", " ").toLowerCase()}
                </span>
              </div>

              <p className="text-xs text-gray-500">{project.client.name}</p>

              {project.description && (
                <p className="mt-2 line-clamp-2 text-xs text-gray-400">{project.description}</p>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-gray-800 pt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
                  {project._count.tasks} tasks
                </span>
                {project.dueDate && (
                  <span className="flex items-center gap-1.5 tabular-nums">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatDate(project.dueDate)}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {creating && (
        <Modal
          title="New project"
          onClose={() => setCreating(false)}
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>Cancel</Button>
              <Button
                size="sm"
                loading={create.isPending}
                disabled={!form.name || !form.clientId}
                onClick={() => create.mutate(form)}
              >
                Create project
              </Button>
            </>
          }
        >
          <div>
            <label htmlFor="p-name" className="mb-1.5 block text-xs font-medium text-gray-400">Project name <span className="text-gray-600">*</span></label>
            <input id="p-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Project name" />
          </div>
          <div>
            <label htmlFor="p-client" className="mb-1.5 block text-xs font-medium text-gray-400">Client <span className="text-gray-600">*</span></label>
            <select id="p-client" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className={inputClass}>
              <option value="">Select client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="p-desc" className="mb-1.5 block text-xs font-medium text-gray-400">Description</label>
            <textarea id="p-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={cn(inputClass, "resize-none")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="p-start" className="mb-1.5 block text-xs font-medium text-gray-400">Start date</label>
              <input id="p-start" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label htmlFor="p-due" className="mb-1.5 block text-xs font-medium text-gray-400">Due date</label>
              <input id="p-due" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={inputClass} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
