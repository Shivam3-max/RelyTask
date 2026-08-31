import type { Session } from "next-auth";
import type { Module, Action } from "./constants";

export function hasPermission(session: Session, module: Module, action: Action): boolean {
  return session.user.permissions.includes(`${module}:${action}`);
}

type OwnableTask = { assigneeId: string | null; creatorId: string };

// "Own" a task = assigned to you OR created by you — matches how task
// deletion already treated ownership before this permission existed.
export function isTaskOwner(userId: string, task: OwnableTask): boolean {
  return task.assigneeId === userId || task.creatorId === userId;
}

export function getTaskReadAccess(session: Session) {
  const canReadAll = hasPermission(session, "tasks", "read_all");
  const canReadOwn = hasPermission(session, "tasks", "read_own");
  return { canReadAll, canReadOwn, canReadAny: canReadAll || canReadOwn };
}

// Prisma where-fragment restricting a task query to ones the user owns.
export function ownTasksFilter(userId: string) {
  return { OR: [{ assigneeId: userId }, { creatorId: userId }] };
}
