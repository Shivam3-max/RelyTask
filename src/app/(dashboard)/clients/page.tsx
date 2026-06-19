"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Plus, UserCircle, FolderOpen, Phone, Mail } from "lucide-react";

type Client = {
  id: string;
  name: string;
  companyName?: string;
  email: string;
  phone?: string;
  _count: { projects: number };
  projects: { status: string }[];
};

export default function ClientsPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", companyName: "", email: "", phone: "" });

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: () => axios.get("/api/clients").then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: typeof form) => axios.post("/api/clients", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      setCreating(false);
      setForm({ name: "", companyName: "", email: "", phone: "" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Clients</h1>
          <p className="text-sm text-gray-400 mt-1">{clients.length} clients</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-3 md:px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Client</span>
        </button>
      </div>

      {isLoading && <p className="text-gray-500 text-sm">Loading...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((client) => {
          const active = client.projects.filter((p) => p.status === "ACTIVE").length;
          return (
            <div
              key={client.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                  <span className="text-indigo-400 font-bold text-sm">
                    {client.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">{client.name}</h3>
                  {client.companyName && (
                    <p className="text-xs text-gray-400 truncate">{client.companyName}</p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{client.email}</span>
                </div>
                {client.phone && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    {client.phone}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 pt-3 border-t border-gray-800 text-xs text-gray-400">
                <div className="flex items-center gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5" />
                  {client._count.projects} projects
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  {active} active
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {creating && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">Add Client</h2>
              <button onClick={() => setCreating(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: "name", label: "Full Name *", placeholder: "Client name" },
                { key: "companyName", label: "Company", placeholder: "Company name" },
                { key: "email", label: "Email *", placeholder: "client@email.com" },
                { key: "phone", label: "WhatsApp Phone", placeholder: "+91 9000000000" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
                  <input
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
              <button onClick={() => setCreating(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">
                Cancel
              </button>
              <button
                onClick={() => create.mutate(form)}
                disabled={!form.name || !form.email || create.isPending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {create.isPending ? "Saving..." : "Add Client"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
