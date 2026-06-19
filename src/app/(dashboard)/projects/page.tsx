"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Plus, FolderOpen, Calendar, CheckSquare } from "lucide-react";
import { formatDate } from "@/lib/utils";

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

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "text-green-400 bg-green-400/10",
  ON_HOLD: "text-yellow-400 bg-yellow-400/10",
  COMPLETED: "text-blue-400 bg-blue-400/10",
  CANCELLED: "text-red-400 bg-red-400/10",
};

export default function ProjectsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", clientId: "", startDate: "", dueDate: "" });

  const { data: projects = [] } = useQuery<Project[]>({
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
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Projects</h1>
          <p className="text-sm text-gray-400 mt-1">{projects.length} projects</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-3 md:px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Project</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <div key={project.id} onClick={() => router.push(`/projects/${project.id}`)} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-indigo-500/50 transition-colors cursor-pointer">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                <h3 className="text-sm font-semibold text-white">{project.name}</h3>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLOR[project.status]}`}>
                {project.status.replace("_", " ")}
              </span>
            </div>

            <p className="text-xs text-indigo-400 mb-2">{project.client.name}</p>

            {project.description && (
              <p className="text-xs text-gray-400 mb-3 line-clamp-2">{project.description}</p>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-gray-800 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5" />
                {project._count.tasks} tasks
              </div>
              {project.dueDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(project.dueDate)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {creating && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">New Project</h2>
              <button onClick={() => setCreating(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Project Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Project name" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Client *</label>
                <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select client</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Start Date</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Due Date</label>
                  <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
              <button onClick={() => setCreating(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
              <button onClick={() => create.mutate(form)} disabled={!form.name || !form.clientId || create.isPending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                {create.isPending ? "Creating..." : "Create Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
