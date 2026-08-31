import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export async function logActivity({
  userId,
  action,
  entity,
  entityId,
  metadata,
}: {
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        userId, action, entity, entityId,
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch {
    // Never let logging failures break the main flow
  }
}
