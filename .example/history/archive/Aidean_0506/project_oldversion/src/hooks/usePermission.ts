"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api/client";

// 用户角色类型
export type UserRole = "USER" | "ADMIN" | "SUPER_ADMIN";

// 权限点定义
export enum Permission {
  // 仪表盘
  DASHBOARD_VIEW = "dashboard:view",

  // 模型管理
  MODELS_VIEW = "models:view",
  MODELS_CREATE = "models:create",
  MODELS_EDIT = "models:edit",
  MODELS_DELETE = "models:delete",

  // 工具管理
  TOOLS_VIEW = "tools:view",
  TOOLS_CREATE = "tools:create",
  TOOLS_EDIT = "tools:edit",
  TOOLS_DELETE = "tools:delete",

  // 天梯管理
  LADDER_VIEW = "ladder:view",
  LADDER_EDIT = "ladder:edit",

  // 用户管理
  USERS_VIEW = "users:view",
  USERS_CREATE = "users:create",
  USERS_EDIT = "users:edit",
  USERS_DELETE = "users:delete",

  // 组织管理
  ORG_VIEW = "org:view",
  ORG_MANAGE = "org:manage",

  // 财务管理
  FINANCE_VIEW = "finance:view",
  FINANCE_MANAGE = "finance:manage",

  // 内容管理
  CONTENT_VIEW = "content:view",
  CONTENT_MANAGE = "content:manage",

  // 系统管理
  SYSTEM_VIEW = "system:view",
  SYSTEM_MANAGE = "system:manage",
}

// 角色权限映射
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  USER: [],
  ADMIN: [
    Permission.DASHBOARD_VIEW,
    Permission.MODELS_VIEW,
    Permission.MODELS_CREATE,
    Permission.MODELS_EDIT,
    Permission.TOOLS_VIEW,
    Permission.TOOLS_CREATE,
    Permission.TOOLS_EDIT,
    Permission.LADDER_VIEW,
    Permission.LADDER_EDIT,
    Permission.USERS_VIEW,
    Permission.ORG_VIEW,
    Permission.FINANCE_VIEW,
    Permission.CONTENT_VIEW,
    Permission.SYSTEM_VIEW,
  ],
  SUPER_ADMIN: Object.values(Permission),
};

// 用户会话信息
interface UserSession {
  id: string;
  email: string;
  nickname?: string;
  role: UserRole;
  permissions: Permission[];
}

interface UsePermissionReturn {
  user: UserSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasRole: (role: UserRole) => boolean;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  canAccessAdmin: boolean;
  isSuperAdmin: boolean;
  refresh: () => Promise<void>;
  logout: () => void;
}

export function usePermission(): UsePermissionReturn {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 获取用户会话
  const fetchUserSession = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.get<{ success: boolean; data: UserSession }>("/auth/me");
      if (res.success) {
        // 合并角色权限
        const rolePermissions = ROLE_PERMISSIONS[res.data.role] || [];
        setUser({
          ...res.data,
          permissions: [...new Set([...rolePermissions, ...(res.data.permissions || [])])],
        });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserSession();
  }, [fetchUserSession]);

  // 检查是否有指定角色
  const hasRole = useCallback(
    (role: UserRole) => {
      return user?.role === role;
    },
    [user]
  );

  // 检查是否有指定权限
  const hasPermission = useCallback(
    (permission: Permission) => {
      return user?.permissions.includes(permission) ?? false;
    },
    [user]
  );

  // 检查是否有任意一个权限
  const hasAnyPermission = useCallback(
    (permissions: Permission[]) => {
      return permissions.some((p) => user?.permissions.includes(p));
    },
    [user]
  );

  // 检查是否有所有权限
  const hasAllPermissions = useCallback(
    (permissions: Permission[]) => {
      return permissions.every((p) => user?.permissions.includes(p));
    },
    [user]
  );

  // 退出登录
  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
    window.location.href = "/admin/login";
  }, []);

  // 是否可以访问管理后台
  const canAccessAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  // 是否超级管理员
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    hasRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessAdmin,
    isSuperAdmin,
    refresh: fetchUserSession,
    logout,
  };
}

// 快捷 Hook：检查特定权限
export function useHasPermission(permission: Permission): boolean {
  const { hasPermission } = usePermission();
  return hasPermission(permission);
}

// 快捷 Hook：检查管理员权限
export function useIsAdmin(): boolean {
  const { canAccessAdmin } = usePermission();
  return canAccessAdmin;
}
