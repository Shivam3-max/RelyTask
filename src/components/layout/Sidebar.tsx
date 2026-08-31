"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, FolderOpen, CheckSquare, UserCircle,
  Shield, BarChart3, Settings, LogOut, BookOpen,
  CalendarDays, Menu, X, Calendar, Trophy,
} from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { GlobalSearch } from "./GlobalSearch";
import { hasPermission, isAdminRole } from "@/lib/permissions";
import type { Module, Action } from "@/lib/constants";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  section: "Workspace" | "Insights" | "Admin";
  permission?: readonly [Module, Action];
  requiresReadAll?: boolean;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  { href: "/dashboard",   label: "Dashboard",    icon: LayoutDashboard, section: "Workspace" },
  { href: "/tasks",       label: "Tasks",        icon: CheckSquare,     section: "Workspace" },
  { href: "/projects",    label: "Projects",     icon: FolderOpen,      section: "Workspace" },
  // Clients/Ad Tracker/SOP Builder are dedicated management pages gated by
  // their own module — nothing else needs their list data, so hiding the link
  // and closing the API to the same permission is safe.
  { href: "/clients",     label: "Clients",      icon: UserCircle,     section: "Workspace", permission: ["clients", "read"] },
  { href: "/calendar",    label: "Calendar",     icon: Calendar,       section: "Workspace" },
  { href: "/sops",        label: "SOP Builder",  icon: BookOpen,       section: "Workspace", permission: ["sops", "read"] },

  { href: "/ads",         label: "Ad Tracker",   icon: BarChart3,      section: "Insights", permission: ["ads", "read"] },
  { href: "/leaderboard", label: "Leaderboard",  icon: Trophy,         section: "Insights" },
  // Capacity shows every team member's workload — a "view all" concern.
  { href: "/capacity",    label: "Capacity",     icon: CalendarDays,   section: "Insights", requiresReadAll: true },
  { href: "/team",        label: "Team",         icon: Users,          section: "Insights" },

  { href: "/roles",       label: "Roles",        icon: Shield,         section: "Admin", adminOnly: true },
  { href: "/settings",    label: "Settings",     icon: Settings,       section: "Admin" },
];

const SECTION_ORDER = ["Workspace", "Insights", "Admin"] as const;

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
    <div className="flex flex-col h-full bg-gray-900">
      {/* Wordmark */}
      <div className="flex items-center justify-between px-4 h-14 shrink-0 border-b border-gray-800">
        <Link href="/dashboard" onClick={onNavClick} className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Logo.png" alt="" className="h-7 w-auto" />
          <span className="text-[15px] font-semibold tracking-tight text-white">
            <span className="text-gray-500">SOP</span> RELYTASK
          </span>
        </Link>
        <button
          onClick={onNavClick}
          aria-label="Close navigation"
          className="lg:hidden -mr-1 p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-1">
        <GlobalSearch />
      </div>

      {/* Nav */}
      <nav aria-label="Main navigation" className="flex-1 px-3 py-2 overflow-y-auto">
        {SECTION_ORDER.map((section) => {
          const group = items.filter((i) => i.section === section);
          if (group.length === 0) return null;
          return (
            <div key={section} className="mb-4 last:mb-0">
              <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-600">
                {section}
              </p>
              <div className="space-y-0.5">
                {group.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(href + "/");
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onNavClick}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-lg px-2.5 h-8 text-[13px] font-medium transition-colors",
                        active
                          ? "bg-gray-800/70 text-white"
                          : "text-gray-400 hover:text-gray-100 hover:bg-gray-800/40"
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-indigo-500" aria-hidden="true" />
                      )}
                      <Icon
                        className={cn(
                          "w-4 h-4 shrink-0 transition-colors",
                          active ? "text-indigo-400" : "text-gray-500 group-hover:text-gray-300"
                        )}
                        aria-hidden="true"
                      />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-gray-800/70 p-2.5 shrink-0">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <span className="grid place-items-center w-7 h-7 rounded-full bg-gray-800 text-[11px] font-semibold text-gray-200 shrink-0" aria-hidden="true">
            {session?.user.name?.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-white truncate">{session?.user.name}</p>
            <p className="text-[11px] text-gray-500 capitalize truncate">
              {session?.user.role?.replace(/_/g, " ")}
            </p>
          </div>
          <NotificationBell />
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 h-8 text-[13px] font-medium text-gray-400 hover:text-gray-100 hover:bg-gray-800/40 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0 text-gray-500" aria-hidden="true" />
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
        <Link href="/dashboard" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Logo.png" alt="" className="h-6 w-auto" />
          <span className="text-sm font-semibold tracking-tight text-white">
            <span className="text-gray-500">SOP</span> RELYTASK
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-drawer"
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        id="mobile-nav-drawer"
        aria-hidden={!mobileOpen}
        className={cn(
          "lg:hidden fixed top-0 left-0 h-full w-[264px] border-r border-gray-800 z-50 transition-transform duration-300 ease-out",
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
      <aside className="hidden lg:flex flex-col w-[248px] min-h-screen border-r border-gray-800 shrink-0">
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
