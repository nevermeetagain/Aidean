export const Permissions = {
  READ: "read",
  WRITE: "write",
  DELETE: "delete",
};

export function hasPermission(userPermissions: string[], permission: string) {
  return userPermissions.includes(permission);
}

export interface UserRoleInfo {
  userId: string;
  roles: string[];
  permissions: string[];
}

export function getUserPermissions(userId: string): string[] {
  return [];
}

export function isAdmin(userRoles: string[]): boolean {
  return userRoles.includes("admin");
}

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ["read", "write", "delete"],
  user: ["read"],
};

export type Resource = "user" | "model" | "script" | "evaluation" | "role" | "permission";
export type Action = "read" | "write" | "delete" | "execute";
