"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useSession } from "next-auth/react";
import { Plus, Mail, Phone, CheckSquare, Pencil, Power, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { usePageTitle } from "@/lib/hooks";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { getAvatarColor } from "@/lib/constants";
import { isAdminRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { inputClass } from "@/components/ui/Input";

const PAGE_SIZE = 9;

type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string | null;
  isActive: boolean;
  role: { id: string; name: string };
  _count: { assignedTasks: number };
};

type Role = { id: string; name: string };

export default function TeamPage() {
  usePageTitle("Team");
  const qc = useQueryClient();
  const { data: session } = useSession();
  const { toast } = useToast();
  const isAdmin = isAdminRole(session?.user.role);
  const [creating, setCreating] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", roleId: "" });
  const [editForm, setEditForm] = useState({ name: "", phone: "", roleId: "", avatar: "" });
  const [confirmToggle, setConfirmToggle] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => axios.get("/api/users").then((r) => r.data),
  });

  const { data: allRoles = [] } = useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: () => axios.get("/api/roles").then((r) => r.data),
  });
  // `superadmin` is the single owner account — not assignable to anyone.
  const roles = allRoles.filter((r) => r.name !== "superadmin");

  const create = useMutation({
    mutationFn: (data: typeof form) => axios.post("/api/users", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setCreating(false);
      setForm({ name: "", email: "", password: "", phone: "", roleId: "" });
      toast("Team member added", "success");
    },
    onError: () => toast("Couldn't add that member", "error"),
  });

  const updateUser = useMutation({
    mutationFn: (data: { name?: string; phone?: string; roleId?: string; avatar?: string | null }) =>
      axios.patch(`/api/users/${editUser!.id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setEditUser(null);
      toast("Member updated", "success");
    },
    onError: () => toast("Couldn't save changes", "error"),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      axios.patch(`/api/users/${id}`, { isActive }).then((r) => r.data),
    onSuccess: (_, { isActive }) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast(isActive ? "Member reactivated" : "Member deactivated", "success");
    },
    onError: () => toast("Couldn't update status", "error"),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q
      ? users.filter(
          (u) =>
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            u.role.name.toLowerCase().includes(q)
        )
      : users;
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function openEdit(user: User) {
    setEditUser(user);
    setEditForm({ name: user.name, phone: user.phone ?? "", roleId: user.role.id, avatar: user.avatar ?? "" });
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Team" description={`${filtered.length} of ${users.length}`}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-600" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search members…"
            className="h-9 w-44 rounded-lg border border-gray-800 bg-gray-900 pl-8 pr-3 text-sm text-white placeholder:text-gray-600 focus:border-indigo-500 focus:outline-none md:w-56"
          />
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add member</span>
          </Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {visible.map((user) => (
          <div
            key={user.id}
            className={cn(
              "rounded-xl border bg-gray-900 p-4",
              user.isActive ? "border-gray-800" : "border-red-900/40 opacity-70"
            )}
          >
            <div className="mb-3.5 flex items-center gap-3">
              <span className={cn("grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full text-sm font-semibold text-onblue", getAvatarColor(user.name))}>
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-semibold text-white">{user.name}</h3>
                  {!user.isActive && <Badge tone="danger">Inactive</Badge>}
                </div>
                <p className="text-xs capitalize text-gray-500">{user.role.name.replace(/_/g, " ")}</p>
              </div>
              {isAdmin && (
                <div className="flex shrink-0 gap-0.5">
                  <button
                    type="button"
                    onClick={() => openEdit(user)}
                    aria-label={`Edit ${user.name}`}
                    className="rounded-md p-1.5 text-gray-600 transition-colors hover:bg-gray-800 hover:text-gray-200"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmToggle(user)}
                    aria-label={user.isActive ? `Deactivate ${user.name}` : `Reactivate ${user.name}`}
                    className={cn(
                      "rounded-md p-1.5 text-gray-600 transition-colors hover:bg-gray-800",
                      user.isActive ? "hover:text-red-400" : "hover:text-green-400"
                    )}
                  >
                    <Power className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <p className="flex items-center gap-2 text-xs text-gray-400">
                <Mail className="h-3.5 w-3.5 shrink-0 text-gray-600" aria-hidden="true" />
                <span className="truncate">{user.email}</span>
              </p>
              {user.phone && (
                <p className="flex items-center gap-2 text-xs text-gray-400">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-gray-600" aria-hidden="true" />
                  {user.phone}
                </p>
              )}
            </div>
            <div className="mt-3.5 flex items-center gap-1.5 border-t border-gray-800 pt-3 text-xs text-gray-500">
              <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
              {user._count.assignedTasks} tasks assigned
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-gray-500 tabular-nums">Page {safePage} of {totalPages}</p>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} aria-label="Previous page" className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} aria-label="Next page" className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white disabled:opacity-30">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {editUser && (
        <Modal
          title={`Edit ${editUser.name}`}
          onClose={() => setEditUser(null)}
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button
                size="sm"
                loading={updateUser.isPending}
                disabled={!editForm.name}
                onClick={() => updateUser.mutate({ name: editForm.name, phone: editForm.phone, roleId: editForm.roleId, avatar: editForm.avatar || null })}
              >
                Save changes
              </Button>
            </>
          }
        >
          <div className="flex items-center gap-4">
            <ImageUpload
              currentUrl={editForm.avatar || null}
              uploadType="avatar"
              entityId={editUser.id}
              onUploaded={(url) => setEditForm({ ...editForm, avatar: url })}
              shape="circle"
              fallbackLabel={editUser.name}
            />
            <div>
              <p className="text-sm font-medium text-white">Profile photo</p>
              <p className="mt-0.5 text-xs text-gray-500">Click or drag to update</p>
            </div>
          </div>
          <div>
            <label htmlFor="e-name" className="mb-1.5 block text-xs font-medium text-gray-400">Full name</label>
            <input id="e-name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label htmlFor="e-phone" className="mb-1.5 block text-xs font-medium text-gray-400">WhatsApp / phone</label>
            <input id="e-phone" type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className={inputClass} placeholder="+91 90000 00000" />
          </div>
          <div>
            <label htmlFor="e-role" className="mb-1.5 block text-xs font-medium text-gray-400">Role</label>
            <select id="e-role" value={editForm.roleId} onChange={(e) => setEditForm({ ...editForm, roleId: e.target.value })} className={inputClass}>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name.replace(/_/g, " ")}</option>)}
            </select>
          </div>
        </Modal>
      )}

      {confirmToggle && (
        <Modal
          title={`${confirmToggle.isActive ? "Deactivate" : "Reactivate"} ${confirmToggle.name}?`}
          onClose={() => setConfirmToggle(null)}
          size="sm"
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setConfirmToggle(null)}>Cancel</Button>
              <Button
                size="sm"
                variant={confirmToggle.isActive ? "danger" : "primary"}
                loading={toggleActive.isPending}
                onClick={() => {
                  toggleActive.mutate({ id: confirmToggle.id, isActive: !confirmToggle.isActive });
                  setConfirmToggle(null);
                }}
              >
                {confirmToggle.isActive ? "Deactivate" : "Reactivate"}
              </Button>
            </>
          }
        >
          <p className="text-sm text-gray-400">
            {confirmToggle.isActive
              ? "They won't be able to sign in until reactivated."
              : "This restores their access to the workspace."}
          </p>
        </Modal>
      )}

      {creating && (
        <Modal
          title="Add team member"
          onClose={() => setCreating(false)}
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>Cancel</Button>
              <Button
                size="sm"
                loading={create.isPending}
                disabled={!form.name || !form.email || !form.password || !form.roleId}
                onClick={() => create.mutate(form)}
              >
                Add member
              </Button>
            </>
          }
        >
          {[
            { key: "name", label: "Full name", placeholder: "Name", type: "text" },
            { key: "email", label: "Email", placeholder: "name@company.com", type: "email" },
            { key: "password", label: "Temporary password", placeholder: "They'll change it on first login", type: "password" },
            { key: "phone", label: "WhatsApp number", placeholder: "+91 90000 00000", type: "tel" },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label htmlFor={`n-${key}`} className="mb-1.5 block text-xs font-medium text-gray-400">
                {label} {key !== "phone" && <span className="text-gray-600">*</span>}
              </label>
              <input
                id={`n-${key}`}
                type={type}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className={inputClass}
                placeholder={placeholder}
              />
            </div>
          ))}
          <div>
            <label htmlFor="n-role" className="mb-1.5 block text-xs font-medium text-gray-400">Role <span className="text-gray-600">*</span></label>
            <select id="n-role" value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} className={inputClass}>
              <option value="">Select role</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name.replace(/_/g, " ")}</option>)}
            </select>
          </div>
        </Modal>
      )}
    </div>
  );
}
