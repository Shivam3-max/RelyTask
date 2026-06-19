import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function isOverdue(dueDate: Date | string | null) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

export const MODULES = [
  "clients",
  "projects",
  "tasks",
  "team",
  "ads",
  "files",
  "reports",
  "roles",
  "settings",
] as const;

export const ACTIONS = ["create", "read", "update", "delete", "approve"] as const;

export type Module = (typeof MODULES)[number];
export type Action = (typeof ACTIONS)[number];
