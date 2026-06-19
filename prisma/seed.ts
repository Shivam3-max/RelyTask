import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ALL_PERMISSIONS = [
  "clients:create", "clients:read", "clients:update", "clients:delete",
  "projects:create", "projects:read", "projects:update", "projects:delete",
  "tasks:create", "tasks:read", "tasks:update", "tasks:delete", "tasks:approve",
  "team:create", "team:read", "team:update", "team:delete",
  "ads:create", "ads:read", "ads:update", "ads:delete",
  "files:create", "files:read", "files:update", "files:delete",
  "reports:read",
  "roles:create", "roles:read", "roles:update", "roles:delete",
  "settings:read", "settings:update",
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

  // Master Admin role (all permissions)
  const adminRole = await prisma.role.upsert({
    where: { name: "master_admin" },
    update: {},
    create: {
      name: "master_admin",
      description: "Full access to everything",
      isSystem: true,
      permissions: { connect: permissions.map((p) => ({ id: p.id })) },
    },
  });

  // Project Manager role
  const pmPermissions = permissions.filter((p) =>
    !["roles:create", "roles:update", "roles:delete", "team:delete", "settings:update"].includes(p.id)
  );
  await prisma.role.upsert({
    where: { name: "project_manager" },
    update: {},
    create: {
      name: "project_manager",
      description: "Manages projects and team tasks",
      isSystem: true,
      permissions: { connect: pmPermissions.map((p) => ({ id: p.id })) },
    },
  });

  // Video Editor role
  const editorPermissions = permissions.filter((p) =>
    ["tasks:read", "tasks:update", "files:create", "files:read", "files:update"].includes(p.id)
  );
  await prisma.role.upsert({
    where: { name: "video_editor" },
    update: {},
    create: {
      name: "video_editor",
      description: "Can view and update assigned tasks, upload files",
      isSystem: false,
      permissions: { connect: editorPermissions.map((p) => ({ id: p.id })) },
    },
  });

  // Graphic Designer role
  await prisma.role.upsert({
    where: { name: "graphic_designer" },
    update: {},
    create: {
      name: "graphic_designer",
      description: "Can view and update assigned tasks, upload files",
      isSystem: false,
      permissions: { connect: editorPermissions.map((p) => ({ id: p.id })) },
    },
  });

  // Ads Manager role
  const adsPermissions = permissions.filter((p) =>
    ["tasks:read", "tasks:update", "ads:read", "ads:update", "reports:read", "files:read"].includes(p.id)
  );
  await prisma.role.upsert({
    where: { name: "ads_manager" },
    update: {},
    create: {
      name: "ads_manager",
      description: "Manages ad campaigns and tracks performance",
      isSystem: false,
      permissions: { connect: adsPermissions.map((p) => ({ id: p.id })) },
    },
  });

  // Client role
  const clientPermissions = permissions.filter((p) =>
    ["tasks:read", "tasks:approve", "files:read"].includes(p.id)
  );
  await prisma.role.upsert({
    where: { name: "client" },
    update: {},
    create: {
      name: "client",
      description: "Client portal access — view and approve only",
      isSystem: true,
      permissions: { connect: clientPermissions.map((p) => ({ id: p.id })) },
    },
  });

  // Create master admin user
  const hashedPassword = await bcrypt.hash("Admin@123", 12);
  await prisma.user.upsert({
    where: { email: "admin@relytask.com" },
    update: {},
    create: {
      name: "Master Admin",
      email: "admin@relytask.com",
      password: hashedPassword,
      roleId: adminRole.id,
    },
  });

  console.log("✅ Seed complete");
  console.log("   Login: admin@relytask.com / Admin@123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
