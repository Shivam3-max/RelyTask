"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import {
  ArrowLeft, Mail, Phone, Globe, FolderOpen,
  CheckSquare, BarChart3, Pencil, Save, X, CheckCircle2, Clock,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { formatDate, isOverdue, cn } from "@/lib/utils";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { PROJECT_STATUS_COLOR, PLATFORM_COLOR } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Input";

type AdMetric = { id: string; spend: number; impressions: number; clicks: number; conversions: number; date: string };
type AdAccount = { id: string; platform: string; accountId?: string; metrics: AdMetric[] };
type Task = { id: string; status: string; dueDate?: string };
type Project = {
  id: string; name: string; status: string; dueDate?: string;
  tasks: Task[]; _count: { tasks: number };
};
type Client = {
  id: string; name: string; companyName?: string; email?: string;
  phone?: string; logo?: string | null; website?: string; notes?: string;
  projects: Project[];
  adAccounts: AdAccount[];
};

export function ClientDetail({ client }: { client: Client }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: client.name,
    companyName: client.companyName ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    logo: client.logo ?? "",
    website: client.website ?? "",
    notes: client.notes ?? "",
  });

  const save = useMutation({
    mutationFn: () => axios.patch(`/api/clients/${client.id}`, form).then((r) => r.data),
    onSuccess: () => {
      toast("Client updated", "success");
      setEditing(false);
    },
    onError: () => toast("Couldn't save changes", "error"),
  });

  const totalTasks = client.projects.reduce((s, p) => s + p._count.tasks, 0);
  const doneTasks = client.projects.reduce((s, p) => s + p.tasks.filter((t) => t.status === "DONE").length, 0);
  const overdueTasks = client.projects.reduce(
    (s, p) => s + p.tasks.filter((t) => t.dueDate && isOverdue(t.dueDate) && t.status !== "DONE").length, 0
  );

  return (
    <div className="max-w-4xl space-y-5">
      <Link href="/clients" className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-white">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Clients
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {editing ? (
              <ImageUpload
                currentUrl={form.logo || null}
                uploadType="logo"
                entityId={client.id}
                onUploaded={(url) => setForm({ ...form, logo: url })}
                shape="square"
                fallbackLabel={client.name}
              />
            ) : (
              <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-indigo-500/15 text-xl font-semibold text-indigo-300">
                {client.logo
                  ? // eslint-disable-next-line @next/next/no-img-element
                    <img src={client.logo} alt="" className="h-full w-full object-cover" />
                  : client.name.charAt(0).toUpperCase()}
              </span>
            )}
            <div>
              {editing ? (
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={cn(inputClass, "w-52 text-lg font-semibold")}
                />
              ) : (
                <h1 className="text-lg font-semibold tracking-tight text-white">{client.name}</h1>
              )}
              {editing ? (
                <input
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  placeholder="Company name"
                  className={cn(inputClass, "mt-1.5 w-52 text-xs")}
                />
              ) : (
                client.companyName && <p className="text-sm text-gray-500">{client.companyName}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>
                  <Save className="h-3.5 w-3.5" aria-hidden="true" /> Save
                </Button>
                <button type="button" onClick={() => setEditing(false)} aria-label="Cancel editing" className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-800 hover:text-white">
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
              </Button>
            )}
          </div>
        </div>

        {/* Contact fields */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {editing ? (
            <>
              {([
                ["email", "Email", "email", "email@company.com"],
                ["phone", "Phone", "tel", "+91 90000 00000"],
                ["website", "Website", "url", "https://…"],
              ] as const).map(([key, label, type, ph]) => (
                <div key={key}>
                  <label className="mb-1 block text-xs text-gray-500">{label}</label>
                  <input type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className={inputClass} placeholder={ph} />
                </div>
              ))}
              <div>
                <label className="mb-1 block text-xs text-gray-500">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={cn(inputClass, "resize-none")} />
              </div>
            </>
          ) : (
            <>
              {client.email && (
                <p className="flex items-center gap-2 text-sm text-gray-400">
                  <Mail className="h-4 w-4 shrink-0 text-gray-600" aria-hidden="true" />
                  <a href={`mailto:${client.email}`} className="truncate hover:text-white">{client.email}</a>
                </p>
              )}
              {client.phone && (
                <p className="flex items-center gap-2 text-sm text-gray-400">
                  <Phone className="h-4 w-4 shrink-0 text-gray-600" aria-hidden="true" />
                  {client.phone}
                </p>
              )}
              {client.website && (
                <p className="flex items-center gap-2 text-sm text-gray-400">
                  <Globe className="h-4 w-4 shrink-0 text-gray-600" aria-hidden="true" />
                  <a href={client.website} target="_blank" rel="noopener noreferrer" className="truncate hover:text-white">{client.website}</a>
                </p>
              )}
              {client.notes && (
                <p className="rounded-lg border border-gray-800 bg-gray-950/40 px-3 py-2 text-sm text-gray-400 sm:col-span-2">
                  {client.notes}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Projects", value: client.projects.length, Icon: FolderOpen },
          { label: "Total tasks", value: totalTasks, Icon: CheckSquare },
          { label: "Completed", value: doneTasks, Icon: CheckCircle2 },
          { label: "Overdue", value: overdueTasks, Icon: Clock, danger: overdueTasks > 0 },
        ].map(({ label, value, Icon, danger }) => (
          <div key={label} className={cn("rounded-xl border bg-gray-900 p-3.5", danger ? "border-red-500/30" : "border-gray-800")}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-gray-500">{label}</span>
              <Icon className={cn("h-3.5 w-3.5", danger ? "text-red-400" : "text-gray-600")} />
            </div>
            <p className={cn("mt-2 text-[22px] font-semibold tabular-nums", danger ? "text-red-400" : "text-white")}>{value}</p>
          </div>
        ))}
      </div>

      {/* Projects */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <FolderOpen className="h-4 w-4 text-gray-500" aria-hidden="true" /> Projects
        </h2>
        {client.projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-800 bg-gray-900/40 py-10 text-center text-sm text-gray-600">
            No projects yet for this client.
          </div>
        ) : (
          <div className="space-y-2">
            {client.projects.map((p) => {
              const done = p.tasks.filter((t) => t.status === "DONE").length;
              const pct = p._count.tasks ? Math.round((done / p._count.tasks) * 100) : 0;
              return (
                <Link key={p.id} href={`/projects/${p.id}`} className="block rounded-xl border border-gray-800 bg-gray-900 px-4 py-3.5 transition-colors hover:border-gray-700">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{p.name}</p>
                      {p.dueDate && <p className="mt-0.5 text-xs text-gray-500">Due {formatDate(p.dueDate)}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", PROJECT_STATUS_COLOR[p.status])}>
                        {p.status.replace("_", " ").toLowerCase()}
                      </span>
                      <span className="text-xs text-gray-500 tabular-nums">{done}/{p._count.tasks}</span>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-800">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Ad accounts */}
      {client.adAccounts.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <BarChart3 className="h-4 w-4 text-gray-500" aria-hidden="true" /> Ad accounts
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {client.adAccounts.map((acc) => {
              const m = acc.metrics[0];
              return (
                <div key={acc.id} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", PLATFORM_COLOR[acc.platform] ?? PLATFORM_COLOR.OTHER)}>
                      {acc.platform}
                    </span>
                    {acc.accountId && <span className="text-xs text-gray-500">{acc.accountId}</span>}
                  </div>
                  {m ? (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><p className="text-gray-500">Spend</p><p className="font-medium text-white tabular-nums">₹{m.spend.toLocaleString()}</p></div>
                      <div><p className="text-gray-500">Impressions</p><p className="font-medium text-white tabular-nums">{m.impressions.toLocaleString()}</p></div>
                      <div><p className="text-gray-500">Clicks</p><p className="font-medium text-white tabular-nums">{m.clicks.toLocaleString()}</p></div>
                      <div><p className="text-gray-500">Conversions</p><p className="font-medium text-white tabular-nums">{m.conversions}</p></div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600">No metrics yet</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
