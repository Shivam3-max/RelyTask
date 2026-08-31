"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { Plus, FolderOpen, Phone, Mail, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { usePageTitle } from "@/lib/hooks";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { inputClass } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";

const PAGE_SIZE = 9;

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
  usePageTitle("Clients");
  const qc = useQueryClient();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", companyName: "", email: "", phone: "" });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data: clients = [], isLoading, isError } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: () => axios.get("/api/clients").then((r) => r.data),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q
      ? clients.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            (c.companyName?.toLowerCase().includes(q) ?? false)
        )
      : clients;
  }, [clients, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const create = useMutation({
    mutationFn: (data: typeof form) => axios.post("/api/clients", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      setCreating(false);
      setForm({ name: "", companyName: "", email: "", phone: "" });
      toast("Client added", "success");
    },
    onError: () => toast("Couldn't add that client", "error"),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clients"
        description={isLoading ? "Loading…" : `${filtered.length} of ${clients.length}`}
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-600" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search clients…"
            className="h-9 w-44 rounded-lg border border-gray-800 bg-gray-900 pl-8 pr-3 text-sm text-white placeholder:text-gray-600 focus:border-indigo-500 focus:outline-none md:w-56"
          />
        </div>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Add client</span>
        </Button>
      </PageHeader>

      {isError && <p className="text-sm text-red-400">Couldn&apos;t load clients. Try refreshing.</p>}

      {!isLoading && filtered.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={search ? "No matches" : "No clients yet"}
          description={search ? "Try a different search." : "Add your first client to start tracking their projects."}
          action={search ? undefined : "Add client"}
          onAction={search ? undefined : () => setCreating(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((client) => {
            const active = client.projects.filter((p) => p.status === "ACTIVE").length;
            return (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="group block rounded-xl border border-gray-800 bg-gray-900 p-4 transition-colors hover:border-gray-700"
              >
                <div className="mb-3.5 flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo-500/15 text-sm font-semibold text-indigo-300">
                    {client.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-white">{client.name}</h3>
                    {client.companyName && <p className="truncate text-xs text-gray-500">{client.companyName}</p>}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="flex items-center gap-2 text-xs text-gray-400">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-gray-600" aria-hidden="true" />
                    <span className="truncate">{client.email}</span>
                  </p>
                  {client.phone && (
                    <p className="flex items-center gap-2 text-xs text-gray-400">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-gray-600" aria-hidden="true" />
                      {client.phone}
                    </p>
                  )}
                </div>
                <div className="mt-3.5 flex items-center gap-4 border-t border-gray-800 pt-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
                    {client._count.projects} projects
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    {active} active
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-gray-500 tabular-nums">Page {safePage} of {totalPages}</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              aria-label="Previous page"
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              aria-label="Next page"
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {creating && (
        <Modal
          title="Add client"
          onClose={() => setCreating(false)}
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>Cancel</Button>
              <Button
                size="sm"
                loading={create.isPending}
                disabled={!form.name || !form.email}
                onClick={() => create.mutate(form)}
              >
                Add client
              </Button>
            </>
          }
        >
          {[
            { key: "name", label: "Full name", placeholder: "Client name", type: "text", required: true },
            { key: "companyName", label: "Company", placeholder: "Company name", type: "text" },
            { key: "email", label: "Email", placeholder: "client@company.com", type: "email", required: true },
            { key: "phone", label: "WhatsApp number", placeholder: "+91 90000 00000", type: "tel" },
          ].map(({ key, label, placeholder, type, required }) => (
            <div key={key}>
              <label htmlFor={key} className="mb-1.5 block text-xs font-medium text-gray-400">
                {label} {required && <span className="text-gray-600">*</span>}
              </label>
              <input
                id={key}
                type={type}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className={inputClass}
                placeholder={placeholder}
              />
            </div>
          ))}
        </Modal>
      )}
    </div>
  );
}
