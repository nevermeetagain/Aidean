"use client";

import { useState, useCallback } from "react";
import { Shield, Users, UserCog, Plus } from "lucide-react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { TableColumn } from "@/components/admin/shared/AdminTable";

interface Role {
  id: string;
  name: string;
  code: string;
  description: string;
  userCount: number;
  permissionCount: number;
  isActive: boolean;
  createdAt: string;
}

const ROLES: Role[] = [
  { id: "1", name: "超级管理员", code: "super_admin", description: "拥有所有系统权限", userCount: 2, permissionCount: 156, isActive: true, createdAt: "2024-01-01" },
  { id: "2", name: "管理员", code: "admin", description: "日常运营管理权限", userCount: 5, permissionCount: 85, isActive: true, createdAt: "2024-01-01" },
  { id: "3", name: "运营人员", code: "operator", description: "内容运营和数据分析", userCount: 12, permissionCount: 45, isActive: true, createdAt: "2024-01-02" },
  { id: "4", name: "普通用户", code: "user", description: "基础功能使用权限", userCount: 1280, permissionCount: 20, isActive: true, createdAt: "2024-01-01" },
  { id: "5", name: "VIP用户", code: "vip", description: "高级功能访问权限", userCount: 56, permissionCount: 35, isActive: true, createdAt: "2024-01-03" },
];

export default function RolesPage() {
  const [roles] = useState(ROLES);
  const [searchKeyword, setSearchKeyword] = useState("");

  const filteredRoles = roles.filter((r) => r.name.toLowerCase().includes(searchKeyword.toLowerCase()) || r.code.toLowerCase().includes(searchKeyword.toLowerCase()));
  const totalUsers = roles.reduce((sum, r) => sum + r.userCount, 0);

  const columns: TableColumn<Role>[] = [
    {
      key: "name",
      title: "角色名称",
      width: "150px",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <Shield className="h-4 w-4" />
          </div>
          <span className="font-medium text-[rgb(var(--admin-text-primary))]">{row.name}</span>
        </div>
      ),
    },
    {
      key: "code",
      title: "角色编码",
      width: "120px",
      render: (row) => <code className="text-xs bg-[rgb(var(--admin-bg-secondary))] px-2 py-1 rounded">{row.code}</code>,
    },
    { key: "description", title: "描述", width: "200px" },
    {
      key: "userCount",
      title: "用户数量",
      width: "100px",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <Users className="h-3.5 w-3.5 text-[rgb(var(--admin-text-secondary))]" />
          <span className="text-sm">{row.userCount}</span>
        </div>
      ),
    },
    {
      key: "permissionCount",
      title: "权限数量",
      width: "100px",
      align: "center",
      render: (row) => <span className="text-sm text-[rgb(var(--admin-primary))]">{row.permissionCount} 项</span>,
    },
    {
      key: "isActive",
      title: "状态",
      width: "70px",
      align: "center",
      render: (row) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${row.isActive ? "text-green-600 bg-green-50" : "text-gray-600 bg-gray-50"}`}>
          {row.isActive ? "启用" : "禁用"}
        </span>
      ),
    },
    {
      key: "actions",
      title: "操作",
      width: "100px",
      align: "center",
      render: () => (
        <div className="flex items-center justify-center gap-1">
          <AdminButton variant="link" size="sm">权限</AdminButton>
          <AdminButton variant="link" size="sm">编辑</AdminButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-[rgb(var(--admin-primary))]" />
        <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">角色管理</h1>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <AdminCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-[rgb(var(--admin-text-primary))]">{roles.length}</div>
            <div className="text-xs text-[rgb(var(--admin-text-secondary))]">角色总数</div>
          </div>
        </AdminCard>
        <AdminCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-[rgb(var(--admin-text-primary))]">{totalUsers.toLocaleString()}</div>
            <div className="text-xs text-[rgb(var(--admin-text-secondary))]">关联用户</div>
          </div>
        </AdminCard>
        <AdminCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
            <UserCog className="h-4 w-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-[rgb(var(--admin-text-primary))]">156</div>
            <div className="text-xs text-[rgb(var(--admin-text-secondary))]">总权限数</div>
          </div>
        </AdminCard>
      </div>

      <AdminListPage<Role>
        title=""
        subtitle="管理系统角色，配置角色权限与用户关联"
        columns={columns}
        data={filteredRoles}
        loading={false}
        searchKeyword={searchKeyword}
        onSearch={setSearchKeyword}
        onCreate={() => {}}
        createButtonText="新建角色"
        emptyText="暂无角色"
      />
    </div>
  );
}
