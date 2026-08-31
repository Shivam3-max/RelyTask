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
    { label: "Completed", count: done, color: "bg-green-500", text: "text-green-400" },
    { label: "In Progress", count: allTasks.filter((t) => t.status === "IN_PROGRESS").length, color: "bg-blue-500", text: "text-blue-400" },
    { label: "Awaiting Approval", count: allTasks.filter((t) => t.status === "CLIENT_APPROVAL").length, color: "bg-purple-500", text: "text-purple-400" },
    { label: "In Revision", count: allTasks.filter((t) => t.status === "REVISION").length, color: "bg-orange-500", text: "text-orange-400" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-white">Reports</h1>
        <p className="text-sm text-gray-400 mt-1">Monthly summary of your project progress</p>
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/10 border border-indigo-500/20 rounded-2xl p-6">
        <p className="text-sm text-gray-400 mb-1">Overall completion across all projects</p>
        <p className="text-4xl font-bold text-white mb-4">{completion}%</p>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
            style={{ width: `${completion}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">{done} of {total} deliverables complete</p>
      </div>

      {/* Status breakdown */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-white mb-5">Deliverable Breakdown</h2>
        <div className="space-y-4">
          {statusBreakdown.map(({ label, count, color, text }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-400">{label}</span>
                <span className={`text-xs font-semibold ${text}`}>{count}</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${color} rounded-full`}
                  style={{ width: total ? `${(count / total) * 100}%` : "0%" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per project */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">Project Progress</h2>
        </div>
        <div className="divide-y divide-gray-800">
          {projects.map((project) => {
            const pDone = project.tasks.filter((t) => t.status === "DONE").length;
            const pTotal = project.tasks.length;
            const pPct = pTotal ? Math.round((pDone / pTotal) * 100) : 0;
            return (
              <div key={project.id} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white">{project.name}</span>
                  <span className="text-xs font-bold text-white">{pPct}%</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pPct}%` }} />
                </div>
                <p className="text-xs text-gray-600 mt-1">{pDone}/{pTotal} tasks</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ad performance placeholder */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-white">Ad Performance</h2>
          <span className="text-xs text-gray-500">(last 30 days)</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Spend", value: "—", icon: <DollarSign className="w-4 h-4 text-yellow-400" /> },
            { label: "Clicks", value: "—", icon: <MousePointer className="w-4 h-4 text-indigo-400" /> },
            { label: "Conversions", value: "—", icon: <Target className="w-4 h-4 text-green-400" /> },
            { label: "ROAS", value: "—", icon: <TrendingUp className="w-4 h-4 text-purple-400" /> },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">{label}</span>
                {icon}
              </div>
              <p className="text-xl font-bold text-gray-500">{value}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">Connect ad account</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
