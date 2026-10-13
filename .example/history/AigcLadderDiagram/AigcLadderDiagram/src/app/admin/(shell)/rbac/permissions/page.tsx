"use client";

import { useState, useCallback } from "react";
import { Key, Layers, Eye, Edit, Trash, Plus, Check } from "lucide-react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { TableColumn } from "@/components/admin/shared/AdminTable";

interface Permission {
  id: string;
  name: string;
  code: string;
  resource: string;
  action: string;
  description: string;
  isActive: boolean;
  roles: string[];
}

const PERMISSIONS: Permission[] = [
  { id: "1", name: "用户查看", code: "user:read", resource: "user", action: "read", description: "查看用户信息", isActive: true, roles: ["admin", "operator"] },
  { id: "2", name: "用户创建", code: "user:create", resource: "user", action: "create", description: "创建新用户", isActive: true, roles: ["admin"] },
  { id: "3", name: "用户编辑", code: "user:update", resource: "user", action: "update", description: "修改用户信息", isActive: true, roles: ["admin"] },
  { id: "4", name: "用户删除", code: "user:delete", resource: "user", action: "delete", description: "删除用户账号", isActive: true, roles: ["super_admin"] },
  { id: "5", name: "模型查看", code: "model:read", resource: "model", action: "read", description: "查看模型信息", isActive: true, roles: ["admin", "operator", "user"] },
  { id: "6", name: "模型编辑", code: "model:update", resource: "model", action: "update", description: "修改模型数据", isActive: true, roles: ["admin"] },
  { id: "7", name: "内容发布", code: "content:create", resource: "content", action: "create", description: "发布资讯公告", isActive: true, roles: ["admin", "operator"] },
  { id: "8", name: "系统配置", code: "system:config", resource: "system", action: "config", description: "修改系统设置", isActive: true, roles: ["super_admin"] },
];

const RESOURCES = Array.from(new Set(PERMISSIONS.map((p) => p.resource)));

const RESOURCE_ICONS: Record<string, React.ReactNode> = {
  user: <span className="text-blue-500">U</span>,
  model: <span className="text-green-500">M</span>,
  content: <span className="text-purple-500">C</span>,
  system: <span className="text-red-500">S</span>,
};

export default function PermissionsPage() {
  const [permissions] = useState(PERMISSIONS);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [resourceFilter, setResourceFilter] = useState<string>("");

  const filteredPermissions = permissions.filter((p) => {
    const matchKeyword = p.name.toLowerCase().includes(searchKeyword.toLowerCase()) || p.code.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchResource = resourceFilter ? p.resource === resourceFilter : true;
    return matchKeyword && matchResource;
  });

  const stats = {
    total: permissions.length,
    resources: RESOURCES.length,
    active: permissions.filter((p) => p.isActive).length,
  };

  const columns: TableColumn<Permission>[] = [
    {
      key: "resource",
      title: "资源",
      width: "60px",
      align: "center",
      render: (row) => (
        <div className="w-7 h-7 rounded bg-[rgb(var(--admin-bg-secondary))] flex items-center justify-center text-xs font-bold">
          {RESOURCE_ICONS[row.resource] || row.resource[0].toUpperCase()}
        </div>
      ),
    },
    {
      key: "name",
      title: "权限名称",
      width: "120px",
      render: (row) => <span className="font-medium text-[rgb(var(--admin-text-primary))]">{row.name}</span>,
    },
    {
      key: "code",
      title: "权限编码",
      width: "140px",
      render: (row) => <code className="text-xs bg-[rgb(var(--admin-bg-secondary))] px-2 py-1 rounded">{row.code}</code>,
    },
    {
      key: "action",
      title: "操作",
      width: "80px",
      align: "center",
      render: (row) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${row.action === "read" ? "bg-blue-50 text-blue-600" : row.action === "delete" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
          {row.action === "read" ? "读取" : row.action === "create" ? "创建" : row.action === "update" ? "更新" : "删除"}
        </span>
      ),
    },
    { key: "description", title: "描述", width: "150px" },
    {
      key: "roles",
      title: "关联角色",
      width: "180px",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.roles.slice(0, 3).map((role) => (
            <span key={role} className="text-xs px-1.5 py-0.5 bg-[rgb(var(--admin-bg-secondary))] rounded">{role}</span>
          ))}
          {row.roles.length > 3 && <span className="text-xs text-[rgb(var(--admin-text-secondary))]">+{row.roles.length - 3}</span>}
        </div>
      ),
    },
    {
      key: "actions",
      title: "操作",
      width: "100px",
      align: "center",
      render: () => (
        <div className="flex items-center justify-center gap-1">
          <AdminButton variant="link" size="sm">编辑</AdminButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Key className="h-6 w-6 text-[rgb(var(--admin-primary))]" />
        <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">权限列表</h1>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <AdminCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <Key className="h-4 w-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-[rgb(var(--admin-text-primary))]">{stats.total}</div>
            <div className="text-xs text-[rgb(var(--admin-text-secondary))]">权限总数</div>
          </div>
        </AdminCard>
        <AdminCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-[rgb(var(--admin-text-primary))]">{stats.resources}</div>
            <div className="text-xs text-[rgb(var(--admin-text-secondary))]">资源类型</div>
          </div>
        </AdminCard>
        <AdminCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
            <Check className="h-4 w-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-[rgb(var(--admin-text-primary))]">{stats.active}</div>
            <div className="text-xs text-[rgb(var(--admin-text-secondary))]">已启用</div>
          </div>
        </AdminCard>
      </div>

      <AdminListPage<Permission>
        title=""
        subtitle="管理系统权限定义，配置资源与动作的访问控制"
        columns={columns}
        data={filteredPermissions}
        loading={false}
        searchKeyword={searchKeyword}
        onSearch={setSearchKeyword}
        onCreate={() => {}}
        createButtonText="新建权限"
        emptyText="暂无权限"
      />
    </div>
  );
}
