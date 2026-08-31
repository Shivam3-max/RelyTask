import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

export const metadata: Metadata = {
  title: {
    template: "%s | RELYTASK",
    default: "Dashboard | RELYTASK",
  },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:text-sm focus:font-medium focus:rounded-lg focus:outline-none"
      >
        Skip to main content
      </a>
      <Sidebar />
      <main id="main-content" className="flex-1 overflow-y-auto bg-gray-950" tabIndex={-1}>
        {/* pt-20 on mobile clears the fixed h-14 top bar; lg gets normal spacing */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 pb-12 pt-20 lg:pt-10">
          <Breadcrumbs />
          {children}
        </div>
      </main>
    </div>
  );
}
