import { prisma } from "@/lib/db/prisma";
import type { Department } from "@prisma/client";

// 角色服务
export async function getRoles(params: { page?: number; limit?: number; keyword?: string } = {}) {
  const { page = 1, limit = 20, keyword } = params;
  
  const where: any = {};
  if (keyword) {
    where.OR = [
      { name: { contains: keyword, mode: "insensitive" } },
      { nameCn: { contains: keyword, mode: "insensitive" } },
      { code: { contains: keyword, mode: "insensitive" } },
    ];
  }
  
  const [items, total] = await Promise.all([
    prisma.role.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { code: "asc" },
      include: {
        _count: {
          select: { userRoleMappings: true, rolePermissions: true },
        },
      },
    }),
    prisma.role.count({ where }),
  ]);
  
  return {
    items: items.map((role) => ({
      ...role,
      userCount: role._count.userRoleMappings,
      permissionCount: role._count.rolePermissions,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getRoleById(id: string) {
  return prisma.role.findUnique({
    where: { id },
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
      _count: {
        select: { userRoleMappings: true },
      },
    },
  });
}

// 权限服务
export async function getPermissions(params: { page?: number; limit?: number; resourceType?: string } = {}) {
  const { page = 1, limit = 20, resourceType } = params;
  
  const where: any = {};
  if (resourceType) {
    where.resourceType = resourceType;
  }
  
  const [items, total] = await Promise.all([
    prisma.permission.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { resource: "asc" },
      include: {
        _count: {
          select: { rolePermissions: true },
        },
      },
    }),
    prisma.permission.count({ where }),
  ]);
  
  return {
    items: items.map((perm) => ({
      ...perm,
      roleCount: perm._count.rolePermissions,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// 部门服务
export async function getDepartments() {
  const departments = await prisma.department.findMany({
    orderBy: [{ level: "asc" }, { code: "asc" }],
    include: {
      teams: true,
    },
  });
  
  // 转换为树形结构
  interface TreeNode extends Department {
    children: TreeNode[];
  }
  const buildTree = (items: typeof departments, parentId: string | null = null): TreeNode[] => {
    return items
      .filter((item) => item.parentId === parentId)
      .map((item) => ({
        ...item,
        children: buildTree(items, item.id),
      })) as TreeNode[];
  };
  
  return buildTree(departments);
}

export async function getDepartmentById(id: string) {
  return prisma.department.findUnique({
    where: { id },
    include: {
      teams: true,
    },
  });
}

// 团队服务
export async function getTeams(params: { page?: number; limit?: number; departmentId?: string } = {}) {
  const { page = 1, limit = 20, departmentId } = params;
  
  const where: any = {};
  if (departmentId) {
    where.departmentId = departmentId;
  }
  
  const [items, total] = await Promise.all([
    prisma.team.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        department: {
          select: { id: true, name: true },
        },
        _count: {
          select: { teamMembers: true },
        },
      },
    }),
    prisma.team.count({ where }),
  ]);
  
  return {
    items: items.map((team) => ({
      ...team,
      memberCount: team._count.teamMembers,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getTeamById(id: string) {
  return prisma.team.findUnique({
    where: { id },
    include: {
      department: true,
      teamMembers: {
        include: {
          user: {
            select: { id: true, email: true, nickname: true },
          },
        },
      },
    },
  });
}
