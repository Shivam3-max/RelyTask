"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Bell, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  title: string;
  body: string;
  type: string;
  readAt?: string;
  createdAt: string;
};

const TYPE_COLOR: Record<string, string> = {
  TASK_ASSIGNED: "bg-indigo-500",
  TASK_DUE: "bg-yellow-500",
  TASK_OVERDUE: "bg-red-500",
  TASK_COMPLETED: "bg-green-500",
  REVISION_REQUESTED: "bg-orange-500",
  CLIENT_APPROVED: "bg-purple-500",
  AD_ALERT: "bg-blue-500",
  MENTION: "bg-pink-500",
  SYSTEM: "bg-gray-500",
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: () => axios.get("/api/notifications").then((r) => r.data),
    refetchInterval: 30000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => axios.patch("/api/notifications", { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAll = useMutation({
    mutationFn: () => axios.patch("/api/notifications", { id: "all" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unread = notifications.filter((n) => !n.readAt).length;

  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouse);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label={unread > 0 ? `Notifications — ${unread} unread` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls="notification-panel"
        className="relative flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
      >
        <Bell className="w-4 h-4" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          id="notification-panel"
          role="menu"
          aria-label="Notifications"
          className="absolute bottom-10 left-0 z-50 mt-1 w-80 overflow-hidden rounded-xl border border-gray-800 bg-gray-900 shadow-2xl lg:bottom-auto lg:left-0 lg:top-full"
        >
          <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {unread > 0 && (
              <button
                onClick={() => markAll.mutate()}
                className="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-white"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-800">
            {notifications.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">No notifications yet</p>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                role="menuitem"
                onClick={() => !n.readAt && markRead.mutate(n.id)}
                disabled={!!n.readAt}
                aria-label={n.readAt ? n.title : `Mark "${n.title}" as read`}
                className={cn(
                  "flex w-full gap-3 px-4 py-3 text-left transition-colors",
                  n.readAt ? "cursor-default opacity-50" : "cursor-pointer hover:bg-gray-800/50"
                )}
              >
                <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", TYPE_COLOR[n.type] ?? "bg-gray-500")} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white">{n.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-[10px] text-gray-600 mt-1">
                    {new Date(n.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {!n.readAt && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
