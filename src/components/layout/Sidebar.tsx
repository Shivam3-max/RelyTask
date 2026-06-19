"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, FolderOpen, CheckSquare, UserCircle,
  Shield, BarChart3, Settings, LogOut, Megaphone, BookOpen,
  CalendarDays, Menu, X, Calendar, Trophy,
} from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { GlobalSearch } from "./GlobalSearch";

const navItems = [
  { href: "/dashboard",  label: "Dashboard",   icon: LayoutDashboard },
  { href: "/clients",    label: "Clients",      icon: UserCircle },
  { href: "/projects",   label: "Projects",     icon: FolderOpen },
  { href: "/tasks",      label: "Tasks",        icon: CheckSquare },
  { href: "/calendar",   label: "Calendar",     icon: Calendar },
  { href: "/sops",       label: "SOP Builder",  icon: BookOpen },
  { href: "/team",       label: "Team",         icon: Users },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/capacity",   label: "Capacity",     icon: CalendarDays },
  { href: "/ads",        label: "Ad Tracker",   icon: BarChart3 },
  { href: "/roles",      label: "Roles",        icon: Shield, adminOnly: true },
  { href: "/settings",   label: "Settings",     icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "master_admin";
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = navItems.filter((i) => !i.adminOnly || isAdmin);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
            <Megaphone className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">RELYTASK</p>
            <p className="text-[10px] text-gray-400 tracking-widest uppercase">SOPs</p>
          </div>
        </div>
        {/* Close on mobile */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden text-gray-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-800">
        <GlobalSearch />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                active
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-gray-800 shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {session?.user.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{session?.user.name}</p>
            <p className="text-xs text-gray-400 capitalize truncate">
              {session?.user.role?.replace(/_/g, " ")}
            </p>
          </div>
          <NotificationBell />
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Megaphone className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-white">RELYTASK</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={() => setMobileOpen(true)}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={cn(
        "lg:hidden fixed top-0 left-0 h-full w-64 bg-gray-900 border-r border-gray-800 z-50 transition-transform duration-300",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-gray-900 border-r border-gray-800 shrink-0">
        <SidebarContent />
      </aside>
    </>
  );
}
