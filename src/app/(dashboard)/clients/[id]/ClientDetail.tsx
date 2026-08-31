"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import {
  ArrowLeft, Building2, Mail, Phone, Globe, FolderOpen,
  CheckSquare, BarChart3, Pencil, Save, X, CheckCircle, Clock,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { formatDate, isOverdue } from "@/lib/utils";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { PROJECT_STATUS_COLOR, PLATFORM_COLOR } from "@/lib/constants";

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
    onError: () => toast("Failed to save", "error"),
  });

  const totalTasks = client.projects.reduce((s, p) => s + p._count.tasks, 0);
  const doneTasks = client.projects.reduce(
    (s, p) => s + p.tasks.filter((t) => t.status === "DONE").length, 0
  );
  const overdueTasks = client.projects.reduce(
    (s, p) => s + p.tasks.filter((t) => t.dueDate && isOverdue(t.dueDate) && t.status !== "DONE").length, 0
  );

  const totalSpend = client.adAccounts.reduce(
    (s, a) => s + (a.metrics[0]?.spend ?? 0), 0
  );

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to Clients
      </Link>

      {/* Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
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
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-2xl font-bold text-indigo-400 shrink-0 overflow-hidden">
                {client.logo
                  ? <img src={client.logo} alt={client.name} className="w-full h-full object-cover" />
                  : client.name.charAt(0).toUpperCase()
                }
              </div>
            )}
            <div>
              {editing ? (
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="text-xl font-bold text-white bg-gray-800 border border-indigo-500 rounded-lg px-2 py-0.5 w-48 focus:outline-none"
                />
              ) : (
                <h1 className="text-xl font-bold text-white">{client.name}</h1>
              )}
              {editing ? (
                <input
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  placeholder="Company name"
                  className="text-sm text-gray-400 bg-gray-800 border border-gray-700 rounded-lg px-2 py-0.5 mt-1 w-48 focus:outline-none"
                />
              ) : (
                client.companyName && <p className="text-sm text-gray-400">{client.companyName}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={() => save.mutate()}
                  disabled={save.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                >
                  <Save className="w-3.5 h-3.5" aria-hidden="true" /> {save.isPending ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  aria-label="Cancel editing"
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Edit
              </button>
            )}
          </div>
        </div>

        {/* Contact fields */}
        <div className="grid sm:grid-cols-2 gap-3 mt-5">
          {editing ? (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="email@client.com" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Phone</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="+91 98765 43210" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Website</label>
                <input type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
            </>
          ) : (
            <>
              {client.email && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Mail className="w-4 h-4 shrink-0 text-gray-600" aria-hidden="true" />
                  <a href={`mailto:${client.email}`} className="hover:text-white truncate">{client.email}</a>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Phone className="w-4 h-4 shrink-0 text-gray-600" aria-hidden="true" />
                  {client.phone}
                </div>
              )}
              {client.website && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Globe className="w-4 h-4 shrink-0 text-gray-600" aria-hidden="true" />
                  <a href={client.website} target="_blank" rel="noopener noreferrer" className="hover:text-white truncate">{client.website}</a>
                </div>
              )}
              {client.notes && (
                <div className="sm:col-span-2 text-sm text-gray-400 bg-gray-800 rounded-lg px-3 py-2">
                  {client.notes}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Projects", value: client.projects.length, icon: <FolderOpen className="w-4 h-4 text-indigo-400" /> },
          { label: "Total Tasks", value: totalTasks, icon: <CheckSquare className="w-4 h-4 text-blue-400" /> },
          { label: "Completed", value: doneTasks, icon: <CheckCircle className="w-4 h-4 text-green-400" /> },
          { label: "Overdue", value: overdueTasks, icon: <Clock className="w-4 h-4 text-red-400" />, danger: overdueTasks > 0 },
        ].map(({ label, value, icon, danger }) => (
          <div key={label} className={`bg-gray-900 border rounded-xl px-4 py-3 flex items-center gap-3 ${danger ? "border-red-900/40" : "border-gray-800"}`}>
            {icon}
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className={`text-sm font-bold ${danger ? "text-red-400" : "text-white"}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Projects */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-indigo-400" /> Projects
          </h2>
        </div>
        {client.projects.length === 0 ? (
          <div className="text-center py-10 bg-gray-900 border border-gray-800 border-dashed rounded-xl text-sm text-gray-600">
            No projects yet for this client.
          </div>
        ) : (
          <div className="space-y-2">
            {client.projects.map((p) => {
              const done = p.tasks.filter((t) => t.status === "DONE").length;
              const pct = p._count.tasks ? Math.round((done / p._count.tasks) * 100) : 0;
              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="block bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{p.name}</p>
                      {p.dueDate && (
                        <p className="text-xs text-gray-500 mt-0.5">Due {formatDate(p.dueDate)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${PROJECT_STATUS_COLOR[p.status]}`}>
                        {p.status.replace("_", " ")}
                      </span>
                      <span className="text-xs text-gray-500">{done}/{p._count.tasks}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full mt-3 overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Ad Accounts */}
      {client.adAccounts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-indigo-400" /> Ad Accounts
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {client.adAccounts.map((acc) => {
              const m = acc.metrics[0];
              return (
                <div key={acc.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLATFORM_COLOR[acc.platform] ?? PLATFORM_COLOR.OTHER}`}>
                      {acc.platform}
                    </span>
                    {acc.accountId && <span className="text-xs text-gray-500">{acc.accountId}</span>}
                  </div>
                  {m ? (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><p className="text-gray-500">Spend</p><p className="text-white font-medium">₹{m.spend.toLocaleString()}</p></div>
                      <div><p className="text-gray-500">Impressions</p><p className="text-white font-medium">{m.impressions.toLocaleString()}</p></div>
                      <div><p className="text-gray-500">Clicks</p><p className="text-white font-medium">{m.clicks.toLocaleString()}</p></div>
                      <div><p className="text-gray-500">Conversions</p><p className="text-white font-medium">{m.conversions}</p></div>
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
