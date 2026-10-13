import type { UserRole } from "@prisma/client";

export const Permissions = {
  READ: "read",
  WRITE: "write",
  DELETE: "delete",
  EXECUTE: "execute",
} as const;

export function hasPermission(userPermissions: string[], permission: string) {
  return userPermissions.includes(permission);
}

export interface UserRoleInfo {
  userId: string;
  roles: string[];
  permissions: string[];
}

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  GUEST: [Permissions.READ],
  USER: [Permissions.READ],
  VIP: [Permissions.READ],
  PREMIUM: [Permissions.READ, Permissions.WRITE],
  MODERATOR: [Permissions.READ, Permissions.WRITE],
  ADMIN: [Permissions.READ, Permissions.WRITE, Permissions.DELETE, Permissions.EXECUTE],
  SUPER_ADMIN: [Permissions.READ, Permissions.WRITE, Permissions.DELETE, Permissions.EXECUTE],
};

export function getUserPermissions(roleOrRoles: string | UserRole | Array<string | UserRole>): string[] {
  const roles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
  return Array.from(
    new Set(
      roles.flatMap((role) => ROLE_PERMISSIONS[String(role)] || [])
    )
  );
}

export function isAdmin(userRoles: Array<string | UserRole>): boolean {
  return userRoles.some((role) => role === "ADMIN" || role === "SUPER_ADMIN");
}

export type Resource = "user" | "model" | "script" | "evaluation" | "role" | "permission";
export type Action = "read" | "write" | "delete" | "execute";
