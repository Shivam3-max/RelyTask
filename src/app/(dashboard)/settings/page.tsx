"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { Settings, Bell, Shield, Database, Save, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const { toast } = useToast();

  const [name, setName] = useState(session?.user.name ?? "");
  const [phone, setPhone] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [showPw, setShowPw] = useState(false);

  const saveProfile = useMutation({
    mutationFn: () =>
      axios.patch(`/api/users/${session?.user.id}`, {
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
      }).then((r) => r.data),
    onSuccess: async () => {
      await update({ name });
      toast("Profile updated", "success");
    },
    onError: () => toast("Failed to save profile", "error"),
  });

  const changePassword = useMutation({
    mutationFn: () =>
      axios.patch(`/api/users/${session?.user.id}`, { password: newPw }).then((r) => r.data),
    onSuccess: () => {
      toast("Password changed", "success");
      setCurrentPw("");
      setNewPw("");
    },
    onError: () => toast("Failed to change password", "error"),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-gray-400 mt-1">Manage your workspace configuration</p>
      </div>

      {/* Profile */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-400" />
          Your Profile
        </h2>

        <div className="grid gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Full Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">WhatsApp / Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex justify-between items-center text-sm text-gray-400 pt-1">
            <span>Email: <span className="text-white">{session?.user.email}</span></span>
            <span>Role: <span className="text-indigo-400 capitalize">{session?.user.role?.replace(/_/g, " ")}</span></span>
          </div>
        </div>

        <button
          onClick={() => saveProfile.mutate()}
          disabled={saveProfile.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Save className="w-4 h-4" />
          {saveProfile.isPending ? "Saving..." : "Save Profile"}
        </button>
      </section>

      {/* Password */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Settings className="w-4 h-4 text-indigo-400" />
          Change Password
        </h2>
        <div className="grid gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Current Password</label>
            <input
              type={showPw ? "text" : "password"}
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="relative">
            <label className="block text-xs text-gray-400 mb-1.5">New Password</label>
            <input
              type={showPw ? "text" : "password"}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
            />
            <button
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 bottom-2.5 text-gray-500 hover:text-gray-300"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <button
          onClick={() => changePassword.mutate()}
          disabled={!newPw || changePassword.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Save className="w-4 h-4" />
          {changePassword.isPending ? "Updating..." : "Update Password"}
        </button>
      </section>

      {/* Notifications */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-400" />
          Notification Channels
        </h2>
        <div className="space-y-4">
          {[
            { label: "Email notifications", desc: "Task assignments, deadlines, approvals" },
            { label: "WhatsApp notifications", desc: "Instant alerts via WhatsApp (Twilio)" },
          ].map(({ label, desc }) => (
            <div key={label} className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
              <button className="relative w-10 h-5 bg-indigo-500 rounded-full transition-colors">
                <span className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Integrations */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-400" />
          Integrations
        </h2>
        <div className="space-y-3">
          {[
            { name: "Meta Ads", status: "Configure in client ad accounts", color: "bg-blue-500" },
            { name: "Google Ads", status: "Configure in client ad accounts", color: "bg-green-500" },
            { name: "Twilio WhatsApp", status: "Add TWILIO_* env vars", color: "bg-purple-500" },
          ].map(({ name, status, color }) => (
            <div key={name} className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${color}`} />
              <span className="text-sm text-white">{name}</span>
              <span className="text-xs text-gray-500 ml-auto">{status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
