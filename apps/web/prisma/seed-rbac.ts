/**
 * S3 RBAC 种子：权限原子 + 系统角色（SUPER_ADMIN/ADMIN/MODERATOR）+ 现有用户回绑。
 * 目标：落 B2 关系表；保证「现有管理员不失权」——按 User.role 枚举回绑对应系统角色。
 * 幂等：按 code 唯一键 upsert；角色权限集每次覆盖为注册表真源。
 * 运行：pnpm --filter web exec tsx prisma/seed-rbac.ts
 */
import { PrismaClient } from "@prisma/client";
import { ALL_PERMISSIONS, SYSTEM_ROLES, PERMISSION_WILDCARD } from "@aidean/shared";

const prisma = new PrismaClient();

// User.role 枚举 → 系统角色 code 的默认回绑（迁移不失权保障）。
const ENUM_TO_ROLE: Record<string, string> = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MODERATOR: "MODERATOR",
};

async function main(): Promise<void> {
  // 1) 权限原子
  for (const p of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { description: p.label, domain: p.domain },
      create: { code: p.code, description: p.label, domain: p.domain },
    });
  }
  const permByCode = new Map((await prisma.permission.findMany()).map((r) => [r.code, r.id]));

  // 2) 系统角色 + 权限集（覆盖式：先清空该角色权限连接，再按注册表重建）
  for (const role of SYSTEM_ROLES) {
    const rec = await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name, description: role.description, isSystem: true },
      create: { code: role.code, name: role.name, description: role.description, isSystem: true },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: rec.id } });
    const permIds = role.permissions
      .filter((c) => c !== PERMISSION_WILDCARD) // 通配不落库，由解析层注入
      .map((c) => permByCode.get(c))
      .filter((id): id is string => !!id);
    if (permIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permIds.map((permissionId) => ({ roleId: rec.id, permissionId })),
        skipDuplicates: true,
      });
    }
  }
  const roleByCode = new Map((await prisma.role.findMany()).map((r) => [r.code, r.id]));

  // 3) 回绑现有用户（按 User.role 枚举；仅补对应系统角色，不动其它已有分配）
  let bound = 0;
  for (const [enumRole, roleCode] of Object.entries(ENUM_TO_ROLE)) {
    const roleId = roleByCode.get(roleCode);
    if (!roleId) continue;
    const users = await prisma.user.findMany({ where: { role: enumRole as never, deletedAt: null }, select: { id: true } });
    for (const u of users) {
      await prisma.userRoleAssignment.upsert({
        where: { userId_roleId: { userId: u.id, roleId } },
        update: {},
        create: { userId: u.id, roleId },
      });
      bound++;
    }
  }

  console.log(
    `[seed-rbac] 权限=${ALL_PERMISSIONS.length} 系统角色=${SYSTEM_ROLES.length} 回绑用户分配=${bound}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
