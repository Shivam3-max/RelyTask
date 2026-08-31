// Seeds deterministic, idempotent fixtures the E2E specs log in as.
// Safe to re-run: every write is an upsert keyed on a stable e2e.* email/name,
// so this never touches real seed data (admin@relytask.com) or piles up rows
// across repeated test runs.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { unlink } from "fs/promises";
import path from "path";
import {
  STAFF, CLIENT_A, CLIENT_B, ADMIN, ADMIN_ONLY_TASK_TITLE,
  ADS_MANAGER, CUSTOM_CLIENTS_CREATOR_ROLE, CUSTOM_CLIENTS_CREATOR, CUSTOM_ROLE_TEST_CLIENT_EMAIL,
  NOT_AWAITING_APPROVAL_TASK_TITLE, REVISION_LIMIT_REACHED_TASK_TITLE,
} from "./fixtures";

const prisma = new PrismaClient();
const STORAGE_ROOT = path.join(process.cwd(), "storage", "task-files");

async function upsertClientWithPortalAccess(
  clientRoleId: string,
  fixture: { email: string; password: string; name: string; companyName: string }
) {
  const hashed = await bcrypt.hash(fixture.password, 12);
  const user = await prisma.user.upsert({
    where: { email: fixture.email },
    update: { password: hashed, isActive: true },
    create: { name: fixture.name, email: fixture.email, password: hashed, roleId: clientRoleId },
  });
  const client = await prisma.client.upsert({
    where: { userId: user.id },
    update: { name: fixture.name, companyName: fixture.companyName },
    create: { name: fixture.name, companyName: fixture.companyName, email: fixture.email, userId: user.id },
  });
  const project =
    (await prisma.project.findFirst({ where: { clientId: client.id } })) ??
    (await prisma.project.create({ data: { name: `${fixture.name} Project`, clientId: client.id } }));
  return { user, client, project };
}

export default async function globalSetup() {
  const videoEditorRole = await prisma.role.findUnique({ where: { name: "video_editor" } });
  const clientRole = await prisma.role.findUnique({ where: { name: "client" } });
  if (!videoEditorRole || !clientRole) {
    throw new Error(
      "Roles not found — run `npm run db:seed` before the E2E suite so video_editor/client roles exist."
    );
  }

  const staffHashed = await bcrypt.hash(STAFF.password, 12);
  const staff = await prisma.user.upsert({
    where: { email: STAFF.email },
    update: { password: staffHashed, isActive: true },
    create: { name: STAFF.name, email: STAFF.email, password: staffHashed, roleId: videoEditorRole.id },
  });

  const a = await upsertClientWithPortalAccess(clientRole.id, CLIENT_A);
  const b = await upsertClientWithPortalAccess(clientRole.id, CLIENT_B);

  const adsManagerRole = await prisma.role.findUnique({ where: { name: "ads_manager" } });
  if (!adsManagerRole) {
    throw new Error("ads_manager role not found — run `npm run db:seed` before the E2E suite.");
  }
  const adsManagerHashed = await bcrypt.hash(ADS_MANAGER.password, 12);
  await prisma.user.upsert({
    where: { email: ADS_MANAGER.email },
    update: { password: adsManagerHashed, isActive: true },
    create: { name: ADS_MANAGER.name, email: ADS_MANAGER.email, password: adsManagerHashed, roleId: adsManagerRole.id },
  });

  // Deliberately narrow role — only clients:create, no clients:read — so the
  // permission-enforcement specs can prove a superadmin's per-action grant
  // actually takes effect, independent of role name.
  const clientsCreatorRole = await prisma.role.upsert({
    where: { name: CUSTOM_CLIENTS_CREATOR_ROLE },
    update: { permissions: { set: [{ id: "clients:create" }] } },
    create: {
      name: CUSTOM_CLIENTS_CREATOR_ROLE,
      description: "E2E fixture — clients:create only",
      isSystem: false,
      permissions: { connect: [{ id: "clients:create" }] },
    },
  });
  const clientsCreatorHashed = await bcrypt.hash(CUSTOM_CLIENTS_CREATOR.password, 12);
  await prisma.user.upsert({
    where: { email: CUSTOM_CLIENTS_CREATOR.email },
    update: { password: clientsCreatorHashed, isActive: true, roleId: clientsCreatorRole.id },
    create: {
      name: CUSTOM_CLIENTS_CREATOR.name,
      email: CUSTOM_CLIENTS_CREATOR.email,
      password: clientsCreatorHashed,
      roleId: clientsCreatorRole.id,
    },
  });
  // A prior run's spec creates a client under this email via the API (which
  // has no delete endpoint) — clear it directly so repeated runs don't pile
  // up duplicate rows (Client.email isn't unique, so a stale row would just
  // silently accumulate rather than fail the test).
  await prisma.client.deleteMany({ where: { email: CUSTOM_ROLE_TEST_CLIENT_EMAIL } });

  // Same for the ad account/metric the ads:create-enforcement spec creates
  // against CLIENT_A — /api/ads has no delete endpoint either. POST
  // /api/ads/metrics always names a manually-created account "manual-<ts>"
  // (see api/ads/metrics/route.ts), and nothing else gives CLIENT_A an ad
  // account, so that prefix alone safely identifies the spec's leftovers.
  const staleAdAccounts = await prisma.adAccount.findMany({
    where: { clientId: a.client.id, accountId: { startsWith: "manual-" } },
  });
  if (staleAdAccounts.length) {
    await prisma.adMetric.deleteMany({ where: { adAccountId: { in: staleAdAccounts.map((x) => x.id) } } });
    await prisma.adAccount.deleteMany({ where: { id: { in: staleAdAccounts.map((x) => x.id) } } });
  }

  // Owned entirely by admin — read_own-scoped roles (like STAFF) must never see it.
  const admin = await prisma.user.findUnique({ where: { email: ADMIN.email } });
  if (!admin) throw new Error(`${ADMIN.email} not found — run \`npm run db:seed\` first.`);
  const adminOnlyTask = await prisma.task.findFirst({ where: { title: ADMIN_ONLY_TASK_TITLE } });
  if (!adminOnlyTask) {
    await prisma.task.create({
      data: {
        title: ADMIN_ONLY_TASK_TITLE,
        category: "OTHER",
        status: "TODO",
        assigneeId: admin.id,
        creatorId: admin.id,
      },
    });
  }

  // One task per client project, assigned to the E2E staff user, so the
  // portal-approval and cross-client-isolation specs have something to act on.
  for (const { project } of [a, b]) {
    const existing = await prisma.task.findFirst({ where: { projectId: project.id } });
    if (!existing) {
      await prisma.task.create({
        data: {
          title: `${project.name} — review deliverable`,
          category: "CLIENT_VIDEO_RECORDING",
          status: "CLIENT_APPROVAL",
          projectId: project.id,
          assigneeId: staff.id,
          creatorId: staff.id,
        },
      });
    } else {
      // Reset to the pending-approval state the specs expect, so the suite
      // stays repeatable after a prior run approved/otherwise mutated it.
      await prisma.task.update({
        where: { id: existing.id },
        data: { status: "CLIENT_APPROVAL", completedAt: null, revisionNo: 0 },
      });

      // Wipe any attachment a prior (possibly crashed-mid-test) run left
      // behind — the attachment specs assert on exact filenames and fail
      // with a strict-mode "2 elements" error if a stale one survives.
      const staleFiles = await prisma.file.findMany({ where: { taskId: existing.id } });
      if (staleFiles.length) {
        await prisma.file.deleteMany({ where: { taskId: existing.id } });
        await Promise.all(
          staleFiles.map((f) => unlink(path.join(STORAGE_ROOT, f.url)).catch(() => {}))
        );
      }
    }
  }

  // Two more fixtures on CLIENT_B's project, dedicated to proving the portal
  // approve/revision endpoint enforces status + the revision cap server-side.
  const notAwaiting = await prisma.task.findFirst({ where: { title: NOT_AWAITING_APPROVAL_TASK_TITLE } });
  if (!notAwaiting) {
    await prisma.task.create({
      data: {
        title: NOT_AWAITING_APPROVAL_TASK_TITLE,
        category: "OTHER",
        status: "IN_PROGRESS",
        projectId: b.project.id,
        assigneeId: staff.id,
        creatorId: staff.id,
      },
    });
  } else {
    await prisma.task.update({ where: { id: notAwaiting.id }, data: { status: "IN_PROGRESS" } });
  }

  const revisionLimitReached = await prisma.task.findFirst({ where: { title: REVISION_LIMIT_REACHED_TASK_TITLE } });
  if (!revisionLimitReached) {
    await prisma.task.create({
      data: {
        title: REVISION_LIMIT_REACHED_TASK_TITLE,
        category: "OTHER",
        status: "CLIENT_APPROVAL",
        maxRevisions: 3,
        revisionNo: 3,
        projectId: b.project.id,
        assigneeId: staff.id,
        creatorId: staff.id,
      },
    });
  } else {
    await prisma.task.update({
      where: { id: revisionLimitReached.id },
      data: { status: "CLIENT_APPROVAL", maxRevisions: 3, revisionNo: 3 },
    });
  }

  await prisma.$disconnect();
}
