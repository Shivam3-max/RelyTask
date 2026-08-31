"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Shield, Plus, Users, Check } from "lucide-react";
import { MODULES, ACTIONS } from "@/lib/constants";
import { usePageTitle } from "@/lib/hooks";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { inputClass } from "@/components/ui/Input";

type Role = {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissions: { module: string; action: string }[];
  _count: { users: number };
};

export default function RolesPage() {
  usePageTitle("Roles & Permissions");
  const qc = useQueryClient();
  const { toast } = useToast();
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
      toast("Role created", "success");
    },
    onError: () => toast("Couldn't create that role", "error"),
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
    <div className="space-y-5">
      <PageHeader title="Roles & permissions" description="Control what each role can access">
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New role</span>
        </Button>
      </PageHeader>

      <div className="grid gap-3">
        {isLoading && <p className="text-sm text-gray-500">Loading roles…</p>}
        {roles.map((role) => (
          <div key={role.id} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-500/15 text-indigo-300">
                  <Shield className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold capitalize text-white">{role.name.replace(/_/g, " ")}</h3>
                    {role.isSystem && <Badge>System</Badge>}
                  </div>
                  {role.description && <p className="mt-0.5 text-xs text-gray-500">{role.description}</p>}
                </div>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 text-xs text-gray-500">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                {role._count.users}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {role.permissions.map((p) => (
                <Badge key={`${p.module}:${p.action}`} tone="accent">
                  {p.module}:{p.action}
                </Badge>
              ))}
              {role.permissions.length === 0 && <span className="text-xs text-gray-600">No permissions</span>}
            </div>
          </div>
        ))}
      </div>

      {creating && (
        <Modal
          title="Create role"
          size="xl"
          onClose={() => setCreating(false)}
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>Cancel</Button>
              <Button size="sm" loading={create.isPending} disabled={!form.name} onClick={handleCreate}>
                Create role
              </Button>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="r-name" className="mb-1.5 block text-xs font-medium text-gray-400">Role name</label>
              <input id="r-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="e.g. video_editor" />
            </div>
            <div>
              <label htmlFor="r-desc" className="mb-1.5 block text-xs font-medium text-gray-400">Description</label>
              <input id="r-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} placeholder="Optional" />
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Permissions</h3>
            <div className="overflow-x-auto rounded-lg border border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-[11px] uppercase tracking-wide text-gray-600">
                    <th className="px-3 py-2 text-left">Module</th>
                    {ACTIONS.map((a) => (
                      <th key={a} className="px-2 py-2 text-center capitalize">{a}</th>
                    ))}
                    <th className="px-2 py-2 text-center">All</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/70">
                  {MODULES.map((module) => (
                    <tr key={module}>
                      <td className="px-3 py-2 text-xs capitalize text-gray-300">{module}</td>
                      {ACTIONS.map((action) => {
                        const key = `${module}:${action}`;
                        return (
                          <td key={action} className="px-2 py-2 text-center">
                            <button
                              onClick={() => togglePermission(module, action)}
                              aria-pressed={!!selected[key]}
                              aria-label={`${module} ${action}`}
                              className={cn(
                                "mx-auto grid h-5 w-5 place-items-center rounded transition-colors",
                                selected[key] ? "bg-indigo-600 text-onblue" : "border border-gray-700 bg-gray-800"
                              )}
                            >
                              {selected[key] && <Check className="h-3 w-3" aria-hidden="true" />}
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() => toggleAll(module)}
                          aria-label={`Toggle all ${module} permissions`}
                          className="text-xs text-gray-400 transition-colors hover:text-white"
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
        </Modal>
      )}
    </div>
  );
}
