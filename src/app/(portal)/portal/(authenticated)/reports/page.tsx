"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { BarChart3, TrendingUp, DollarSign, MousePointer, Target } from "lucide-react";

type Project = { id: string; name: string; tasks: { status: string }[] };

export default function PortalReportsPage() {
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["portal-projects"],
    queryFn: () => axios.get("/api/portal/projects").then((r) => r.data),
  });

  const allTasks = projects.flatMap((p) => p.tasks);
  const done = allTasks.filter((t) => t.status === "DONE").length;
  const total = allTasks.length;
  const completion = total ? Math.round((done / total) * 100) : 0;

  const statusBreakdown = [
    { label: "Completed", count: done, color: "bg-green-400", text: "text-green-400" },
    { label: "In progress", count: allTasks.filter((t) => t.status === "IN_PROGRESS").length, color: "bg-blue-400", text: "text-blue-400" },
    { label: "Awaiting approval", count: allTasks.filter((t) => t.status === "CLIENT_APPROVAL").length, color: "bg-purple-400", text: "text-purple-400" },
    { label: "In revision", count: allTasks.filter((t) => t.status === "REVISION").length, color: "bg-orange-400", text: "text-orange-400" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-white">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">Summary of your project progress.</p>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <p className="text-xs text-gray-500">Overall completion across all projects</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums text-white">{completion}%</p>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-gray-800">
          <div className="h-full rounded-full bg-indigo-500 transition-[width] duration-700 ease-out" style={{ width: `${completion}%` }} />
        </div>
        <p className="mt-2 text-xs text-gray-500">{done} of {total} deliverables complete</p>
      </div>

      {/* Status breakdown */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="mb-4 text-sm font-semibold text-white">Deliverable breakdown</h2>
        <div className="space-y-3.5">
          {statusBreakdown.map(({ label, count, color, text }) => (
            <div key={label}>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-gray-400">{label}</span>
                <span className={`font-semibold tabular-nums ${text}`}>{count}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
                <div className={`h-full rounded-full ${color}`} style={{ width: total ? `${(count / total) * 100}%` : "0%" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per project */}
      <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
        <div className="border-b border-gray-800 px-5 py-3">
          <h2 className="text-sm font-semibold text-white">Project progress</h2>
        </div>
        <div className="divide-y divide-gray-800/60">
          {projects.map((project) => {
            const pDone = project.tasks.filter((t) => t.status === "DONE").length;
            const pTotal = project.tasks.length;
            const pPct = pTotal ? Math.round((pDone / pTotal) * 100) : 0;
            return (
              <div key={project.id} className="px-5 py-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[13px] text-gray-100">{project.name}</span>
                  <span className="text-xs font-semibold tabular-nums text-white">{pPct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
                  <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pPct}%` }} />
                </div>
                <p className="mt-1 text-xs text-gray-600 tabular-nums">{pDone}/{pTotal} tasks</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ad performance placeholder */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-gray-500" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-white">Ad performance</h2>
          <span className="text-xs text-gray-500">last 30 days</span>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Spend", Icon: DollarSign },
            { label: "Clicks", Icon: MousePointer },
            { label: "Conversions", Icon: Target },
            { label: "ROAS", Icon: TrendingUp },
          ].map(({ label, Icon }) => (
            <div key={label} className="rounded-lg border border-gray-800 bg-gray-950/40 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-gray-500">{label}</span>
                <Icon className="h-3.5 w-3.5 text-gray-600" aria-hidden="true" />
              </div>
              <p className="mt-2 text-[19px] font-semibold text-gray-600">—</p>
              <p className="mt-0.5 text-[10px] text-gray-600">Connect ad account</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
