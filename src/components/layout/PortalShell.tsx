"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut, FolderOpen, CheckSquare, BarChart3, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/portal", label: "Overview", icon: LayoutGrid },
  { href: "/portal/projects", label: "Projects", icon: FolderOpen },
  { href: "/portal/approvals", label: "Approvals", icon: CheckSquare },
  { href: "/portal/reports", label: "Reports", icon: BarChart3 },
];

// The parent (server) layout already verified the session and role before
// rendering this — no auth/redirect logic belongs here, just the chrome.
export function PortalShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-950 pb-16 md:pb-0">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-gray-800 bg-gray-950/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 md:h-16 md:px-6">
          <div className="flex items-center gap-7">
            <Link href="/portal" className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-600 text-[12px] font-bold text-white">R</span>
              <span className="text-sm font-semibold tracking-tight text-white">
                RELYTASK <span className="font-normal text-gray-500">Portal</span>
              </span>
            </Link>
            <nav aria-label="Client portal navigation" className="hidden items-center gap-0.5 md:flex">
              {navItems.map(({ href, label }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                      active ? "bg-gray-800/70 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800/40"
                    )}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-[13px] font-medium text-white">{session?.user.name}</p>
              <p className="text-[11px] text-gray-500">Client</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/portal/login" })}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-gray-400 transition-colors hover:bg-gray-800 hover:text-white md:px-3"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-9">{children}</main>

      {/* Mobile bottom nav */}
      <nav aria-label="Client portal mobile navigation" className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-gray-800 bg-gray-950/90 backdrop-blur md:hidden">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                active ? "text-indigo-400" : "text-gray-500 hover:text-gray-300"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
