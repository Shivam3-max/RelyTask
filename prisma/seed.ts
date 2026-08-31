import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ALL_PERMISSIONS = [
  "clients:create", "clients:read", "clients:update", "clients:delete",
  "projects:create", "projects:read", "projects:update", "projects:delete",
  // tasks:read is split into read_own (assigned to / created by the user)
  // and read_all (every task org-wide) — see src/lib/permissions.ts.
  "tasks:create", "tasks:read_own", "tasks:read_all", "tasks:update", "tasks:delete", "tasks:approve",
  "team:create", "team:read", "team:update", "team:delete",
  "ads:create", "ads:read", "ads:update", "ads:delete",
  "files:create", "files:read", "files:update", "files:delete",
  "reports:read",
  "roles:create", "roles:read", "roles:update", "roles:delete",
  "settings:read", "settings:update",
  "sops:create", "sops:read", "sops:update", "sops:delete",
];

async function main() {
  // Create permissions
  const permissions = await Promise.all(
    ALL_PERMISSIONS.map((p) => {
      const [module, action] = p.split(":");
      return prisma.permission.upsert({
        where: { id: p },
        update: {},
        create: { id: p, module, action },
      });
    })
  );

  // This seed is designed to run automatically on every deploy, so it must be
  // idempotent and MUST NOT overwrite data an admin may have changed. Roles are
  // therefore created only when missing (`update: {}`); an existing role — its
  // permission set included — is left exactly as it is. If a future change to
  // the permission model needs to reach roles that already exist, do that in a
  // dedicated one-off script, not here.
  const ensureRole = async (
    name: string,
    description: string,
    isSystem: boolean,
    permIds: string[]
  ) =>
    prisma.role.upsert({
      where: { name },
      update: {},
      create: {
        name,
        description,
        isSystem,
        permissions: { connect: permIds.map((id) => ({ id })) },
      },
    });

  // Master Admin role (all permissions)
  const adminPermIds = permissions.map((p) => p.id);
  const adminRole = await ensureRole(
    "master_admin",
    "Full access to everything",
    true,
    adminPermIds
  );

  // Project Manager role
  const pmPermIds = permissions
    .filter((p) => !["roles:create", "roles:update", "roles:delete", "team:delete", "settings:update"].includes(p.id))
    .map((p) => p.id);
  await ensureRole("project_manager", "Manages projects and team tasks", true, pmPermIds);

  // Video Editor / Graphic Designer — see/act on their own tasks only
  const editorPermIds = ["tasks:read_own", "tasks:update", "files:create", "files:read", "files:update"];
  await ensureRole("video_editor", "Can view and update assigned tasks, upload files", false, editorPermIds);
  await ensureRole("graphic_designer", "Can view and update assigned tasks, upload files", false, editorPermIds);

  // Social Media Handler role — manages content tasks + their attachments
  const socialPermIds = ["tasks:read_own", "tasks:update", "files:create", "files:read", "files:update"];
  await ensureRole("social_media_handler", "Handles social media content tasks", false, socialPermIds);

  // Ads Manager role
  const adsPermIds = ["tasks:read_own", "tasks:update", "ads:create", "ads:read", "ads:update", "reports:read", "files:read"];
  await ensureRole("ads_manager", "Manages ad campaigns and tracks performance", false, adsPermIds);

  // Client role — portal access is scoped by client/project ownership
  // (see /api/portal/*), not by this permission set, but tasks:read_own /
  // tasks:approve / files:read still describe what a client can do.
  const clientPermIds = ["tasks:read_own", "tasks:approve", "files:read"];
  await ensureRole("client", "Client portal access — view and approve only", true, clientPermIds);

  // Create the master admin user only if it doesn't exist yet. `update: {}`
  // means a reseed never touches an existing account — its password, name and
  // role stay whatever they were changed to.
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@relytask.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin@123";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        name: "Master Admin",
        email: adminEmail,
        password: await bcrypt.hash(adminPassword, 12),
        roleId: adminRole.id,
      },
    });
    console.log(`   Created admin user: ${adminEmail}`);
  }

  // Initial team. Each gets <firstname>@relytask.com and a shared temporary
  // password (SEED_TEMP_PASSWORD) they should change on first login. Like the
  // admin above, these are create-only — a reseed never resets an existing
  // account, so changed passwords and role reassignments stick.
  const TEAM: { name: string; email: string; role: string }[] = [
    { name: "Shivam", email: "shivam@relytask.com", role: "master_admin" },
    { name: "Manik", email: "manik@relytask.com", role: "master_admin" },
    { name: "Shubham", email: "shubham@relytask.com", role: "graphic_designer" },
    { name: "Sumit", email: "sumit@relytask.com", role: "video_editor" },
    { name: "Gagandeep", email: "gagandeep@relytask.com", role: "video_editor" },
    { name: "Daksh", email: "daksh@relytask.com", role: "social_media_handler" },
    { name: "Rohit", email: "rohit@relytask.com", role: "ads_manager" },
  ];

  const tempPassword = process.env.SEED_TEMP_PASSWORD || "Rely@Temp2026";
  const roleByName = new Map(
    (await prisma.role.findMany({ select: { id: true, name: true } })).map((r) => [r.name, r.id])
  );

  for (const member of TEAM) {
    if (await prisma.user.findUnique({ where: { email: member.email } })) continue;
    const roleId = roleByName.get(member.role);
    if (!roleId) {
      console.warn(`   ⚠ skipped ${member.email} — role "${member.role}" not found`);
      continue;
    }
    await prisma.user.create({
      data: {
        name: member.name,
        email: member.email,
        password: await bcrypt.hash(tempPassword, 12),
        roleId,
      },
    });
    console.log(`   Created ${member.role}: ${member.email}`);
  }

  console.log("✅ Seed complete (idempotent — existing rows untouched)");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1); // fail the deploy if the seed can't complete
  });
