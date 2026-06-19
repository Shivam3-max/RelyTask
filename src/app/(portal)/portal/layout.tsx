"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Megaphone, LogOut, FolderOpen, CheckSquare, BarChart3 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/portal", label: "Overview", icon: Megaphone },
  { href: "/portal/projects", label: "Projects", icon: FolderOpen },
  { href: "/portal/approvals", label: "Approvals", icon: CheckSquare },
  { href: "/portal/reports", label: "Reports", icon: BarChart3 },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/portal/login");
    if (status === "authenticated" && session.user.role !== "client") router.push("/dashboard");
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 pb-16 md:pb-0">
      {/* Top nav */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center">
                <Megaphone className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <span className="text-sm font-bold text-white">RELYTASK</span>
                <span className="text-[10px] text-gray-400 ml-1 hidden sm:inline">Client Portal</span>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                      active ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white">{session?.user.name}</p>
              <p className="text-xs text-gray-400">Client</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/portal/login" })}
              className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-5 md:py-8">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex z-40">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] transition-colors",
                active ? "text-indigo-400" : "text-gray-500 hover:text-gray-300"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
