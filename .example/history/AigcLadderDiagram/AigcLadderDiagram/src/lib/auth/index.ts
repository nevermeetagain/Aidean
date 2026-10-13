export enum Role {
  ADMIN = "admin",
  USER = "user",
}

export function checkPermission(userRole: Role, requiredRole: Role) {
  return userRole === requiredRole || userRole === Role.ADMIN;
}
