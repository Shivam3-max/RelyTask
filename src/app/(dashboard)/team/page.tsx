"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useSession } from "next-auth/react";
import { Plus, Mail, Phone, CheckSquare, Pencil, Power, Search, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 9;
import { useToast } from "@/components/ui/Toast";
import { usePageTitle } from "@/lib/hooks";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { getAvatarColor } from "@/lib/constants";

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
  const isAdmin = session?.user.role === "master_admin";
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

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: () => axios.get("/api/roles").then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: typeof form) => axios.post("/api/users", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setCreating(false);
      setForm({ name: "", email: "", password: "", phone: "", roleId: "" });
      toast("Team member added", "success");
    },
    onError: () => toast("Failed to add member", "error"),
  });

  const updateUser = useMutation({
    mutationFn: (data: { name?: string; phone?: string; roleId?: string; avatar?: string | null }) =>
      axios.patch(`/api/users/${editUser!.id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setEditUser(null);
      toast("Member updated", "success");
    },
    onError: () => toast("Failed to update member", "error"),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      axios.patch(`/api/users/${id}`, { isActive }).then((r) => r.data),
    onSuccess: (_, { isActive }) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast(isActive ? "Member reactivated" : "Member deactivated", "success");
    },
    onError: () => toast("Failed to update status", "error"),
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Team</h1>
          <p className="text-sm text-gray-400 mt-1">
            {filtered.length} of {users.length} members
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search members…"
              className="pl-9 pr-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44 md:w-56"
            />
          </div>
          {isAdmin && (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Member
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((user) => (
          <div key={user.id} className={`bg-gray-900 border rounded-xl p-5 ${user.isActive ? "border-gray-800" : "border-red-900/40 opacity-70"}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full ${getAvatarColor(user.name)} flex items-center justify-center text-sm font-bold text-white shrink-0 overflow-hidden`}>
                {user.avatar
                  ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  : user.name.charAt(0).toUpperCase()
                }
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white truncate">{user.name}</h3>
                  {!user.isActive && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">Inactive</span>
                  )}
                </div>
                <p className="text-xs text-indigo-400 capitalize">{user.role.name.replace(/_/g, " ")}</p>
              </div>
              {isAdmin && (
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(user)}
                    aria-label={`Edit ${user.name}`}
                    className="p-1.5 text-gray-600 hover:text-indigo-400 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmToggle(user)}
                    aria-label={user.isActive ? `Deactivate ${user.name}` : `Reactivate ${user.name}`}
                    className={`p-1.5 hover:bg-gray-800 rounded-lg transition-colors ${user.isActive ? "text-gray-600 hover:text-red-400" : "text-gray-600 hover:text-green-400"}`}
                  >
                    <Power className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-1.5 mb-4">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  {user.phone}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 pt-3 border-t border-gray-800 text-xs text-gray-400">
              <CheckSquare className="w-3.5 h-3.5" />
              {user._count.assignedTasks} tasks assigned
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-500">
            Page {safePage} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              aria-label="Previous page"
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              aria-label="Next page"
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-member-title">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 id="edit-member-title" className="text-lg font-semibold text-white">Edit {editUser.name}</h2>
              <button type="button" onClick={() => setEditUser(null)} aria-label="Close" className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {/* Avatar upload */}
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
                  <p className="text-sm text-white font-medium">Profile Photo</p>
                  <p className="text-xs text-gray-500 mt-0.5">Click or drag to update</p>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Full Name</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">WhatsApp / Phone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="+91 9000000000"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Role</label>
                <select
                  value={editForm.roleId}
                  onChange={(e) => setEditForm({ ...editForm, roleId: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
              <button onClick={() => setEditUser(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
              <button
                onClick={() => updateUser.mutate({ name: editForm.name, phone: editForm.phone, roleId: editForm.roleId, avatar: editForm.avatar || null })}
                disabled={!editForm.name || updateUser.isPending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {updateUser.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate/Reactivate confirmation */}
      {confirmToggle && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-toggle-title">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-6">
            <h2 id="confirm-toggle-title" className="text-base font-semibold text-white mb-2">
              {confirmToggle.isActive ? "Deactivate" : "Reactivate"} {confirmToggle.name}?
            </h2>
            <p className="text-sm text-gray-400 mb-5">
              {confirmToggle.isActive
                ? "This will prevent the member from logging in."
                : "This will restore the member's access."}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmToggle(null)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  toggleActive.mutate({ id: confirmToggle.id, isActive: !confirmToggle.isActive });
                  setConfirmToggle(null);
                }}
                disabled={toggleActive.isPending}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${
                  confirmToggle.isActive ? "bg-red-600 hover:bg-red-500" : "bg-green-600 hover:bg-green-500"
                }`}
              >
                {confirmToggle.isActive ? "Deactivate" : "Reactivate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {creating && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="add-member-title">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 id="add-member-title" className="text-lg font-semibold text-white">Add Team Member</h2>
              <button type="button" onClick={() => setCreating(false)} aria-label="Close" className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: "name", label: "Full Name *", placeholder: "Name", type: "text" },
                { key: "email", label: "Email *", placeholder: "email@agency.com", type: "email" },
                { key: "password", label: "Password *", placeholder: "Temp password", type: "password" },
                { key: "phone", label: "WhatsApp Number", placeholder: "+91 9000000000", type: "tel" },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
                  <input
                    type={type}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={placeholder}
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Role *</label>
                <select
                  value={form.roleId}
                  onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select role</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
              <button onClick={() => setCreating(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
              <button
                onClick={() => create.mutate(form)}
                disabled={!form.name || !form.email || !form.password || !form.roleId || create.isPending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {create.isPending ? "Adding..." : "Add Member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
