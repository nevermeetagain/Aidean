import { prisma } from "@/lib/db/prisma";
import { BaseRepository } from "./base.repository";
import type { Role, Permission } from "@prisma/client";

export class RoleRepository extends BaseRepository<Role> {
  protected model = prisma.role;
}

export class PermissionRepository extends BaseRepository<Permission> {
  protected model = prisma.permission;
}

