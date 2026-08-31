"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Trophy, Target, CheckCircle, Clock, Zap } from "lucide-react";
import { usePageTitle } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";

type Leader = {
  id: string;
  name: string;
  role: string;
  total: number;
  done: number;
  recentDone: number;
  onTime: number;
  sopCompliance: number;
  score: number;
};

const MEDAL = ["🥇","🥈","🥉"];
const ROLE_COLOR: Record<string, string> = {
  superadmin: "text-red-400 bg-red-400/10",
  admin: "text-red-400 bg-red-400/10",
  project_manager: "text-purple-400 bg-purple-400/10",
  video_editor: "text-blue-400 bg-blue-400/10",
  graphic_designer: "text-pink-400 bg-pink-400/10",
  social_media_handler: "text-teal-400 bg-teal-400/10",
  ads_manager: "text-yellow-400 bg-yellow-400/10",
};

export default function LeaderboardPage() {
  usePageTitle("Leaderboard");
  const { data: leaders = [], isLoading, isError } = useQuery<Leader[]>({
    queryKey: ["leaderboard"],
    queryFn: () => axios.get("/api/leaderboard").then((r) => r.data),
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Leaderboard" description="Team ranking — tasks completed in the last 30 days" />

      {isError && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Couldn&apos;t load the leaderboard. Try refreshing.
        </p>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-16" role="status" aria-label="Loading leaderboard">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        </div>
      )}

      {!isLoading && leaders.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <Trophy className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p>No team members yet</p>
        </div>
      )}

      {/* Top 3 podium */}
      {leaders.length >= 2 && (
        <div className="grid grid-cols-3 gap-3 mb-2">
          {/* 2nd place */}
          <div className="flex flex-col items-center">
            <div className="text-2xl mb-2">🥈</div>
            <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center text-lg font-bold text-white mb-2">
              {leaders[1]?.name.charAt(0)}
            </div>
            <p className="text-xs font-medium text-white text-center truncate w-full px-1">{leaders[1]?.name.split(" ")[0]}</p>
            <p className="text-lg font-bold text-gray-300">{leaders[1]?.score}</p>
            <p className="text-[10px] text-gray-500">pts</p>
          </div>

          {/* 1st place */}
          <div className="flex flex-col items-center">
            <div className="text-3xl mb-2">🥇</div>
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 border-2 border-yellow-500 flex items-center justify-center text-xl font-bold text-yellow-400 mb-2">
              {leaders[0]?.name.charAt(0)}
            </div>
            <p className="text-xs font-semibold text-white text-center truncate w-full px-1">{leaders[0]?.name.split(" ")[0]}</p>
            <p className="text-xl font-bold text-yellow-400">{leaders[0]?.score}</p>
            <p className="text-[10px] text-gray-500">pts</p>
          </div>

          {/* 3rd place */}
          <div className="flex flex-col items-center">
            {leaders[2] ? (
              <>
                <div className="text-2xl mb-2">🥉</div>
                <div className="w-14 h-14 rounded-full bg-orange-700/20 flex items-center justify-center text-lg font-bold text-orange-300 mb-2">
                  {leaders[2].name.charAt(0)}
                </div>
                <p className="text-xs font-medium text-white text-center truncate w-full px-1">{leaders[2].name.split(" ")[0]}</p>
                <p className="text-lg font-bold text-orange-300">{leaders[2].score}</p>
                <p className="text-[10px] text-gray-500">pts</p>
              </>
            ) : <div className="h-full" />}
          </div>
        </div>
      )}

      {/* Full leaderboard table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
          <Zap className="w-4 h-4 text-indigo-400" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-white">Full Rankings</h3>
          <span className="text-xs text-gray-500">· Score = Completed×10 + Urgent×5 + On-time×3</span>
        </div>
        <div className="divide-y divide-gray-800">
          {leaders.map((leader, idx) => {
            const completion = leader.total ? Math.round((leader.done / leader.total) * 100) : 0;
            return (
              <div key={leader.id} className={cn(
                "flex items-center gap-4 px-5 py-4 transition-colors",
                idx === 0 && "bg-yellow-500/5"
              )}>
                {/* Rank */}
                <div className="text-lg w-8 text-center shrink-0">
                  {idx < 3 ? MEDAL[idx] : <span className="text-sm text-gray-500 font-bold">#{idx + 1}</span>}
                </div>

                {/* Avatar */}
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0",
                  idx === 0 ? "bg-yellow-500/20 border border-yellow-500/50 text-yellow-400" : "bg-indigo-500/20 text-indigo-300"
                )}>
                  {leader.name.charAt(0)}
                </div>

                {/* Name + role */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{leader.name}</p>
                  <span className={cn("mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize",
                    ROLE_COLOR[leader.role] ?? "bg-gray-800 text-gray-400"
                  )}>
                    {leader.role.replace(/_/g, " ")}
                  </span>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-6 text-xs">
                  <div className="text-center">
                    <p className="font-bold text-white">{leader.recentDone}</p>
                    <p className="text-gray-500">done (30d)</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-white">{leader.onTime}</p>
                    <p className="text-gray-500">on-time</p>
                  </div>
                  <div className="text-center">
                    <p className={cn("font-bold", leader.sopCompliance === 100 ? "text-green-400" : leader.sopCompliance >= 70 ? "text-yellow-400" : "text-red-400")}>
                      {leader.sopCompliance}%
                    </p>
                    <p className="text-gray-500">SOP</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="hidden w-24 md:block">
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${completion}%` }} />
                  </div>
                  <p className="mt-0.5 text-right text-[10px] text-gray-500 tabular-nums">{completion}% done</p>
                </div>

                {/* Score */}
                <div className="text-right shrink-0">
                  <p className={cn("text-lg font-bold", idx === 0 ? "text-yellow-400" : "text-white")}>{leader.score}</p>
                  <p className="text-[10px] text-gray-500">pts</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SOP Compliance panel */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-4 h-4 text-green-400" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-white">SOP Compliance Tracking</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {leaders.map((leader) => (
            <div key={leader.id} className="bg-gray-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-white">{leader.name.split(" ")[0]}</p>
                <span className={cn("text-xs font-bold",
                  leader.sopCompliance === 100 ? "text-green-400" :
                  leader.sopCompliance >= 70 ? "text-yellow-400" : "text-red-400"
                )}>
                  {leader.sopCompliance}%
                </span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all",
                    leader.sopCompliance === 100 ? "bg-green-500" :
                    leader.sopCompliance >= 70 ? "bg-yellow-500" : "bg-red-500"
                  )}
                  style={{ width: `${leader.sopCompliance}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                {leader.sopCompliance === 100 ? "Perfect compliance" :
                 leader.sopCompliance >= 70 ? "Good compliance" : "Needs improvement"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Scoring legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: <Trophy className="w-4 h-4 text-yellow-400" aria-hidden="true"/>, label: "Task completed", pts: "+10 pts" },
          { icon: <Zap className="w-4 h-4 text-red-400" aria-hidden="true"/>, label: "Urgent task done", pts: "+5 pts" },
          { icon: <Clock className="w-4 h-4 text-green-400" aria-hidden="true"/>, label: "Completed on time", pts: "+3 pts" },
          { icon: <Target className="w-4 h-4 text-indigo-400" aria-hidden="true"/>, label: "SOP checklist", pts: "% tracked" },
        ].map(({ icon, label, pts }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center gap-3">
            {icon}
            <div>
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-sm font-bold text-white">{pts}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
