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
import { hasPermission, isAdminRole } from "@/lib/permissions";

const navItems = [
  { href: "/dashboard",  label: "Dashboard",   icon: LayoutDashboard },
  // Clients/Ad Tracker/SOP Builder are dedicated management pages (contact
  // info, ad account tokens, SOP content) gated by their own module — unlike
  // Projects/Team, nothing else in the app needs their list data, so hiding
  // the link and closing the underlying API to the same permission is safe.
  { href: "/clients",    label: "Clients",      icon: UserCircle, permission: ["clients", "read"] as const },
  // Projects/Team stay visible to everyone signed in: the Tasks board (every
  // role) reads /api/projects and /api/users as shared name-lookup data for
  // its filters, so gating the page without splitting that endpoint would
  // just hide the link while leaving the same data reachable underneath.
  { href: "/projects",   label: "Projects",     icon: FolderOpen },
  { href: "/tasks",      label: "Tasks",        icon: CheckSquare },
  { href: "/calendar",   label: "Calendar",     icon: Calendar },
  { href: "/sops",       label: "SOP Builder",  icon: BookOpen, permission: ["sops", "read"] as const },
  { href: "/team",       label: "Team",         icon: Users },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  // Capacity shows every team member's workload — that's a "view all", not "view own", concern.
  { href: "/capacity",   label: "Capacity",     icon: CalendarDays, requiresReadAll: true },
  { href: "/ads",        label: "Ad Tracker",   icon: BarChart3, permission: ["ads", "read"] as const },
  { href: "/roles",      label: "Roles",        icon: Shield, adminOnly: true },
  { href: "/settings",   label: "Settings",     icon: Settings },
];

interface SidebarContentProps {
  pathname: string;
  session: ReturnType<typeof useSession>["data"];
  isAdmin: boolean;
  canViewAllTasks: boolean;
  onNavClick: () => void;
}

function SidebarContent({ pathname, session, isAdmin, canViewAllTasks, onNavClick }: SidebarContentProps) {
  const items = navItems.filter(
    (i) =>
      (!i.adminOnly || isAdmin) &&
      (!i.requiresReadAll || canViewAllTasks) &&
      (!i.permission || (!!session && hasPermission(session, i.permission[0], i.permission[1])))
  );

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
            <Megaphone className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">RELYTASK</p>
            <p className="text-[10px] text-gray-400 tracking-widest uppercase">SOPs</p>
          </div>
        </div>
        {/* Close on mobile */}
        <button
          onClick={onNavClick}
          aria-label="Close navigation"
          className="lg:hidden text-gray-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-800">
        <GlobalSearch />
      </div>

      {/* Nav */}
      <nav aria-label="Main navigation" className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavClick}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                active
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-gray-800 shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white shrink-0" aria-hidden="true">
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
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
        >
          <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = isAdminRole(session?.user.role);
  const canViewAllTasks = !!session && hasPermission(session, "tasks", "read_all");
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Megaphone className="w-3.5 h-3.5 text-white" aria-hidden="true" />
          </div>
          <span className="text-sm font-bold text-white">RELYTASK</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-drawer"
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        id="mobile-nav-drawer"
        aria-hidden={!mobileOpen}
        className={cn(
          "lg:hidden fixed top-0 left-0 h-full w-64 bg-gray-900 border-r border-gray-800 z-50 transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent
          pathname={pathname}
          session={session}
          isAdmin={isAdmin}
          canViewAllTasks={canViewAllTasks}
          onNavClick={() => setMobileOpen(false)}
        />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-gray-900 border-r border-gray-800 shrink-0">
        <SidebarContent
          pathname={pathname}
          session={session}
          isAdmin={isAdmin}
          canViewAllTasks={canViewAllTasks}
          onNavClick={() => {}}
        />
      </aside>
    </>
  );
}
