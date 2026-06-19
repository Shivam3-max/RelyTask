"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  dueDate?: string;
  assignee?: { name: string };
  project?: { name: string; client: { name: string } };
};

const PRIORITY_COLOR: Record<string, string> = {
  LOW: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  MEDIUM: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  URGENT: "bg-red-500/20 text-red-400 border-red-500/30",
};

const STATUS_DOT: Record<string, string> = {
  TODO: "bg-gray-500", IN_PROGRESS: "bg-blue-500", IN_REVIEW: "bg-yellow-500",
  CLIENT_APPROVAL: "bg-purple-500", REVISION: "bg-orange-500", DONE: "bg-green-500",
};

const CATEGORY_LABEL: Record<string, string> = {
  VIDEO_EDITING: "Video", GRAPHIC_DESIGN: "Design", ADS_MANAGEMENT: "Ads",
  SHOOT: "Shoot", CONTENT_WRITING: "Content", STRATEGY: "Strategy",
  REPORTING: "Reports", OTHER: "Other",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function CalendarPage() {
  const today = new Date();
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: () => axios.get("/api/tasks").then((r) => r.data),
  });

  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  // Index tasks by day of month for current month/year
  const tasksByDay: Record<number, Task[]> = {};
  tasks.forEach((task) => {
    if (!task.dueDate) return;
    const d = new Date(task.dueDate);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!tasksByDay[day]) tasksByDay[day] = [];
      tasksByDay[day].push(task);
    }
  });

  const selectedTasks = selectedDay ? (tasksByDay[selectedDay] ?? []) : [];

  function prevMonth() {
    setCurrent(new Date(year, month - 1, 1));
    setSelectedDay(null);
  }
  function nextMonth() {
    setCurrent(new Date(year, month + 1, 1));
    setSelectedDay(null);
  }

  // Build grid: 6 rows × 7 cols
  const cells: { day: number; curr: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, curr: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, curr: true });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - daysInMonth - firstDay + 1, curr: false });

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">Content Calendar</h1>
          <p className="text-sm text-gray-400 mt-1">Task deadlines across all projects</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-xl px-1 py-1">
          <button onClick={prevMonth} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-white px-3 min-w-[140px] text-center">
            {MONTHS[month]} {year}
          </span>
          <button onClick={nextMonth} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calendar grid */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-800">
            {DAYS.map((d) => (
              <div key={d} className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {cells.map((cell, idx) => {
              const dayTasks = cell.curr ? (tasksByDay[cell.day] ?? []) : [];
              const hasOverdue = dayTasks.some((t) => t.status !== "DONE");
              const allDone = dayTasks.length > 0 && dayTasks.every((t) => t.status === "DONE");
              return (
                <div
                  key={idx}
                  onClick={() => cell.curr && dayTasks.length > 0 && setSelectedDay(cell.day === selectedDay ? null : cell.day)}
                  className={cn(
                    "border-b border-r border-gray-800 p-2 min-h-[70px] md:min-h-[90px] transition-colors",
                    cell.curr ? "cursor-pointer hover:bg-gray-800/50" : "opacity-30",
                    selectedDay === cell.day && cell.curr && "bg-indigo-500/10",
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1",
                    isToday(cell.day) && cell.curr ? "bg-indigo-500 text-white" : "text-gray-400"
                  )}>
                    {cell.day}
                  </div>
                  {dayTasks.length > 0 && (
                    <div className="space-y-0.5">
                      {dayTasks.slice(0, 2).map((t) => (
                        <div key={t.id} className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded truncate border",
                          PRIORITY_COLOR[t.priority]
                        )}>
                          {t.title}
                        </div>
                      ))}
                      {dayTasks.length > 2 && (
                        <div className="text-[10px] text-gray-500">+{dayTasks.length - 2} more</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          {selectedDay ? (
            <>
              <h3 className="text-sm font-semibold text-white mb-1">
                {MONTHS[month]} {selectedDay}
              </h3>
              <p className="text-xs text-gray-500 mb-4">{selectedTasks.length} task{selectedTasks.length !== 1 ? "s" : ""} due</p>
              <div className="space-y-3">
                {selectedTasks.map((task) => (
                  <div key={task.id} className="bg-gray-800 rounded-xl p-3">
                    <div className="flex items-start gap-2 mb-2">
                      <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", STATUS_DOT[task.status])} />
                      <p className="text-sm font-medium text-white leading-snug">{task.title}</p>
                    </div>
                    {task.project && (
                      <p className="text-xs text-indigo-400 mb-1">{task.project.client.name} · {task.project.name}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{CATEGORY_LABEL[task.category]}</span>
                      {task.assignee && (
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center text-[9px] font-bold text-white">
                            {task.assignee.name.charAt(0)}
                          </div>
                          <span className="text-xs text-gray-400">{task.assignee.name.split(" ")[0]}</span>
                        </div>
                      )}
                    </div>
                    <span className={cn("inline-block mt-2 text-[10px] px-1.5 py-0.5 rounded border", PRIORITY_COLOR[task.priority])}>
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <Calendar className="w-8 h-8 text-gray-700 mb-3" />
              <p className="text-sm text-gray-500">Click a date to see tasks</p>
              <p className="text-xs text-gray-600 mt-1">
                {Object.values(tasksByDay).flat().length} tasks this month
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        {[["LOW","bg-gray-500"],["MEDIUM","bg-blue-500"],["HIGH","bg-orange-500"],["URGENT","bg-red-500"]].map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={cn("w-2 h-2 rounded-full", color)} />
            {label}
          </div>
        ))}
        <span className="text-gray-600">· Colors indicate task priority</span>
      </div>
    </div>
  );
}
