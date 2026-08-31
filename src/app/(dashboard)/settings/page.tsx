"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { Settings, Bell, Shield, Database, Save, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { usePageTitle } from "@/lib/hooks";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  usePageTitle("Settings");
  const { data: session, update } = useSession();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState<string>("");

  useEffect(() => {
    // Seed the editable fields from the session once it resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (session?.user.name && !name) setName(session.user.name);
    if (session?.user.avatar && !avatar) setAvatar(session.user.avatar);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [showPw, setShowPw] = useState(false);

  const saveProfile = useMutation({
    mutationFn: () =>
      axios.patch(`/api/users/${session?.user.id}`, {
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        avatar: avatar || null,
      }).then((r) => r.data),
    onSuccess: async () => {
      await update({ name });
      toast("Profile updated", "success");
    },
    onError: () => toast("Failed to save profile", "error"),
  });

  const changePassword = useMutation({
    mutationFn: () =>
      axios.patch(`/api/users/${session?.user.id}`, {
        password: newPw,
        currentPassword: currentPw,
      }).then((r) => r.data),
    onSuccess: () => {
      toast("Password changed", "success");
      setCurrentPw("");
      setNewPw("");
    },
    onError: (err: unknown) => {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.error ?? "Failed to change password")
        : "Failed to change password";
      toast(msg, "error");
    },
  });

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader title="Settings" description="Your profile and preferences" />

      {/* Profile */}
      <section className="space-y-4 rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Shield className="h-4 w-4 text-gray-500" aria-hidden="true" />
          Your profile
        </h2>

        {/* Avatar upload */}
        {session?.user.id && (
          <div className="flex items-center gap-5">
            <ImageUpload
              currentUrl={avatar || null}
              uploadType="avatar"
              entityId={session.user.id}
              onUploaded={(url) => setAvatar(url)}
              shape="circle"
              fallbackLabel={name || session.user.name || "U"}
            />
            <div>
              <p className="text-sm text-white font-medium">Profile Photo</p>
              <p className="text-xs text-gray-500 mt-0.5">Click or drag an image to update</p>
            </div>
          </div>
        )}

        <div className="grid gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Full Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">WhatsApp / Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className={inputClass}
            />
          </div>
          <div className="flex items-center justify-between pt-1 text-sm text-gray-500">
            <span>Email <span className="text-gray-300">{session?.user.email}</span></span>
            <span>Role <span className="capitalize text-gray-300">{session?.user.role?.replace(/_/g, " ")}</span></span>
          </div>
        </div>

        <Button size="sm" loading={saveProfile.isPending} onClick={() => saveProfile.mutate()}>
          <Save className="h-3.5 w-3.5" />
          Save profile
        </Button>
      </section>

      {/* Password */}
      <section className="space-y-4 rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Settings className="h-4 w-4 text-gray-500" aria-hidden="true" />
          Change password
        </h2>
        <div className="grid gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Current Password</label>
            <input
              type={showPw ? "text" : "password"}
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="relative">
            <label className="block text-xs text-gray-400 mb-1.5">New Password</label>
            <input
              type={showPw ? "text" : "password"}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className={cn(inputClass, "pr-10")}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              aria-label={showPw ? "Hide password" : "Show password"}
              className="absolute right-3 bottom-2.5 text-gray-500 hover:text-gray-300"
            >
              {showPw ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
            </button>
          </div>
        </div>
        <Button
          size="sm"
          variant="secondary"
          loading={changePassword.isPending}
          disabled={!currentPw || !newPw}
          onClick={() => changePassword.mutate()}
        >
          <Save className="h-3.5 w-3.5" />
          Update password
        </Button>
      </section>

      {/* Notifications */}
      <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
          <Bell className="h-4 w-4 text-gray-500" aria-hidden="true" />
          Notification channels
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
      <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
          <Database className="h-4 w-4 text-gray-500" aria-hidden="true" />
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
