"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  clients: "Clients",
  projects: "Projects",
  tasks: "Tasks",
  calendar: "Calendar",
  sops: "SOP Builder",
  team: "Team",
  leaderboard: "Leaderboard",
  capacity: "Capacity",
  ads: "Ad Tracker",
  roles: "Roles",
  settings: "Settings",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null;

  const crumbs = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label = LABELS[seg] ?? (/^[a-z0-9]{10,}$/.test(seg) ? "Detail" : seg);
    const isLast = i === segments.length - 1;
    return { href, label, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-gray-500 mb-4">
      <Link href="/dashboard" className="hover:text-gray-300 transition-colors">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {crumbs.map(({ href, label, isLast }) => (
        <span key={href} className="flex items-center gap-1">
          <ChevronRight className="w-3 h-3" />
          {isLast ? (
            <span className="text-gray-300">{label}</span>
          ) : (
            <Link href={href} className="hover:text-gray-300 transition-colors">{label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}
