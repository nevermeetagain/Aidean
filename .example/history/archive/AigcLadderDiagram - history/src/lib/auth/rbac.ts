/**
 * RBAC权限控制系统
 * 基于角色的访问控制（Role-Based Access Control）
 * 支持资源-操作粒度的权限控制
 */

import { prisma } from '@/lib/db/prisma';

// 资源类型
export type Resource = 
  | 'user'
  | 'model'
  | 'skill'
  | 'mcp_server'
  | 'agent'
  | 'api_station'
  | 'evaluation'
  | 'ladder'
  | 'finance'
  | 'role'
  | 'permission'
  | 'system'
  | 'news'
  | 'favorite'
  | 'collection';

// 操作类型
export type Action = 'create' | 'read' | 'update' | 'delete' | 'execute' | 'manage';

// 权限检查选项
export interface PermissionCheckOptions {
  resource: Resource;
  action: Action;
  resourceId?: string; // 用于检查资源所有权
  tenantId?: string;   // 多租户隔离
}

// 用户角色信息
export interface UserRoleInfo {
  userId: string;
  role: string;
  permissions: string[];
  isAdmin: boolean;
  tenantId: string;
}

/**
 * 预定义角色权限映射
 */
export const ROLE_PERMISSIONS: Record<string, { permissions: string[]; isAdmin: boolean }> = {
  SUPER_ADMIN: {
    permissions: ['*:*'], // 通配符表示所有权限
    isAdmin: true,
  },
  ADMIN: {
    permissions: [
      'user:*',
      'model:*',
      'skill:*',
      'mcp_server:*',
      'agent:*',
      'api_station:*',
      'evaluation:*',
      'ladder:*',
      'finance:*',
      'role:*',
      'permission:*',
      'system:*',
      'news:*',
    ],
    isAdmin: true,
  },
  PROVIDER: {
    permissions: [
      'skill:create',
      'skill:update',
      'skill:delete',
      'skill:read',
      'mcp_server:create',
      'mcp_server:update',
      'mcp_server:delete',
      'mcp_server:read',
      'agent:create',
      'agent:update',
      'agent:delete',
      'agent:read',
      'api_station:create',
      'api_station:update',
      'api_station:delete',
      'api_station:read',
      'model:read',
      'evaluation:execute',
      'finance:read',
      'user:read',
      'user:update',
    ],
    isAdmin: false,
  },
  VIP: {
    permissions: [
      'model:read',
      'skill:read',
      'mcp_server:read',
      'agent:read',
      'api_station:read',
      'evaluation:execute',
      'finance:*',
      'favorite:*',
      'collection:*',
      'user:read',
      'user:update',
      'news:read',
    ],
    isAdmin: false,
  },
  USER: {
    permissions: [
      'model:read',
      'skill:read',
      'mcp_server:read',
      'agent:read',
      'api_station:read',
      'evaluation:execute',
      'finance:read',
      'favorite:*',
      'collection:*',
      'user:read',
      'user:update',
      'news:read',
    ],
    isAdmin: false,
  },
  GUEST: {
    permissions: [
      'model:read',
      'skill:read',
      'mcp_server:read',
      'agent:read',
      'api_station:read',
      'ladder:read',
      'news:read',
    ],
    isAdmin: false,
  },
};

/**
 * 从数据库获取用户角色和权限
 * TODO: 数据库RBAC表创建后启用完整查询
 */
export async function getUserPermissions(userId: string): Promise<UserRoleInfo | null> {
  try {
    // 查询用户基本信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return null;

    // 使用预定义角色权限
    const permissions: string[] = [];
    let isAdmin = false;
    const tenantId = '0';

    const roleKey = user.role as keyof typeof ROLE_PERMISSIONS;
    if (ROLE_PERMISSIONS[roleKey]) {
      permissions.push(...ROLE_PERMISSIONS[roleKey].permissions);
      isAdmin = ROLE_PERMISSIONS[roleKey].isAdmin;
    } else {
      // 默认使用USER权限
      permissions.push(...ROLE_PERMISSIONS.USER.permissions);
    }

    return {
      userId: user.id,
      role: user.role,
      permissions,
      isAdmin,
      tenantId,
    };
  } catch (error) {
    console.error('获取用户权限失败:', error);
    return null;
  }
}

/**
 * 检查用户是否有指定权限
 */
export function hasPermission(
  userPermissions: string[],
  resource: Resource,
  action: Action
): boolean {
  // 超级管理员通配符
  if (userPermissions.includes('*:*')) return true;
  
  // 资源通配符
  if (userPermissions.includes(`${resource}:*`)) return true;
  
  // 具体权限
  const requiredPermission = `${resource}:${action}`;
  return userPermissions.includes(requiredPermission);
}

/**
 * 检查用户是否是管理员
 */
export function isAdmin(role: string): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

/**
 * 检查资源所有权
 */
export async function checkResourceOwnership(
  resource: Resource,
  resourceId: string,
  userId: string
): Promise<boolean> {
  try {
    switch (resource) {
      case 'user':
        return resourceId === userId;
      
      case 'favorite':
        const favorite = await prisma.favorite.findUnique({
          where: { id: resourceId },
          select: { userId: true },
        });
        return favorite?.userId === userId;
      
      case 'collection':
        // 需要创建UserCollection模型
        return true;
      
      case 'skill':
      case 'mcp_server':
      case 'agent':
      case 'api_station':
        // 工具提供者检查
        const toolOwner = await prisma.$queryRaw<{ userId: string }[]>`
          SELECT user_id as "userId" FROM ${resource}s WHERE id = ${resourceId}
        `;
        return toolOwner[0]?.userId === userId;
      
      default:
        return false;
    }
  } catch (error) {
    console.error('检查资源所有权失败:', error);
    return false;
  }
}

/**
 * 权限检查装饰器
 */
export function requirePermission(resource: Resource, action: Action) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      // 第一个参数通常是请求对象
      const request = args[0];
      const user = request.user;
      
      if (!user) {
        throw new Error('未授权访问');
      }
      
      if (!hasPermission(user.permissions, resource, action)) {
        throw new Error('权限不足');
      }
      
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}
