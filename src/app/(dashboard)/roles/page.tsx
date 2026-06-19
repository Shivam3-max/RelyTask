"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Shield, Plus, Users, Trash2, Check } from "lucide-react";
import { MODULES, ACTIONS } from "@/lib/utils";

type Role = {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissions: { module: string; action: string }[];
  _count: { users: number };
};

export default function RolesPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const { data: roles = [], isLoading } = useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: () => axios.get("/api/roles").then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: { name: string; description: string; permissions: { module: string; action: string }[] }) =>
      axios.post("/api/roles", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      setCreating(false);
      setForm({ name: "", description: "" });
      setSelected({});
    },
  });

  function togglePermission(module: string, action: string) {
    const key = `${module}:${action}`;
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleAll(module: string) {
    const allSelected = ACTIONS.every((a) => selected[`${module}:${a}`]);
    const next = { ...selected };
    ACTIONS.forEach((a) => { next[`${module}:${a}`] = !allSelected; });
    setSelected(next);
  }

  function handleCreate() {
    const permissions = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([key]) => {
        const [module, action] = key.split(":");
        return { module, action };
      });
    create.mutate({ ...form, permissions });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Roles & Permissions</h1>
          <p className="text-sm text-gray-400 mt-1">Control what each role can access</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-3 md:px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Role</span>
        </button>
      </div>

      {/* Existing roles */}
      <div className="grid gap-4">
        {isLoading && (
          <p className="text-gray-500 text-sm">Loading roles...</p>
        )}
        {roles.map((role) => (
          <div key={role.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white capitalize">
                      {role.name.replace(/_/g, " ")}
                    </h3>
                    {role.isSystem && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
                        System
                      </span>
                    )}
                  </div>
                  {role.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{role.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Users className="w-3.5 h-3.5" />
                {role._count.users} users
              </div>
            </div>

            {/* Permission badges */}
            <div className="flex flex-wrap gap-1.5">
              {role.permissions.map((p) => (
                <span
                  key={`${p.module}:${p.action}`}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                >
                  {p.module}:{p.action}
                </span>
              ))}
              {role.permissions.length === 0 && (
                <span className="text-xs text-gray-600">No permissions</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create role modal */}
      {creating && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">Create New Role</h2>
              <button
                onClick={() => setCreating(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Role Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. video_editor"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Description</label>
                  <input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Optional"
                  />
                </div>
              </div>

              {/* Permission matrix */}
              <div>
                <h3 className="text-sm font-medium text-white mb-3">Permissions</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left text-xs text-gray-400 pb-2 pr-4">Module</th>
                        {ACTIONS.map((a) => (
                          <th key={a} className="text-xs text-gray-400 pb-2 px-2 text-center capitalize">
                            {a}
                          </th>
                        ))}
                        <th className="text-xs text-gray-400 pb-2 px-2 text-center">All</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {MODULES.map((module) => (
                        <tr key={module}>
                          <td className="py-2 pr-4 text-gray-300 capitalize text-xs">{module}</td>
                          {ACTIONS.map((action) => {
                            const key = `${module}:${action}`;
                            return (
                              <td key={action} className="py-2 px-2 text-center">
                                <button
                                  onClick={() => togglePermission(module, action)}
                                  className={`w-5 h-5 rounded flex items-center justify-center mx-auto transition-colors ${
                                    selected[key]
                                      ? "bg-indigo-500 text-white"
                                      : "bg-gray-800 border border-gray-700"
                                  }`}
                                >
                                  {selected[key] && <Check className="w-3 h-3" />}
                                </button>
                              </td>
                            );
                          })}
                          <td className="py-2 px-2 text-center">
                            <button
                              onClick={() => toggleAll(module)}
                              className="text-xs text-indigo-400 hover:text-indigo-300"
                            >
                              all
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                onClick={handleCreate}
                disabled={!form.name || create.isPending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {create.isPending ? "Creating..." : "Create Role"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
