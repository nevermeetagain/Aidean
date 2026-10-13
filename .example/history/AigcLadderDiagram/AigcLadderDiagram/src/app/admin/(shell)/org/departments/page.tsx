"use client";

import { useState, useCallback } from "react";
import { Building2, Users, UserCircle, Plus, ChevronRight, ChevronDown } from "lucide-react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { TableColumn } from "@/components/admin/shared/AdminTable";

interface Department {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  manager: string;
  userCount: number;
  level: number;
  isActive: boolean;
  children?: Department[];
}

const DEPARTMENTS: Department[] = [
  { id: "1", name: "总裁办", code: "CEO", parentId: null, manager: "张三", userCount: 3, level: 0, isActive: true },
  { id: "2", name: "技术部", code: "TECH", parentId: null, manager: "李四", userCount: 25, level: 0, isActive: true },
  { id: "3", name: "前端组", code: "FE", parentId: "2", manager: "王五", userCount: 8, level: 1, isActive: true },
  { id: "4", name: "后端组", code: "BE", parentId: "2", manager: "赵六", userCount: 10, level: 1, isActive: true },
  { id: "5", name: "产品部", code: "PM", parentId: null, manager: "钱七", userCount: 12, level: 0, isActive: true },
  { id: "6", name: "运营部", code: "OP", parentId: null, manager: "孙八", userCount: 15, level: 0, isActive: true },
];

export default function DepartmentsPage() {
  const [departments] = useState(DEPARTMENTS);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["1", "2"]));

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const filteredDepartments = departments.filter((d) => d.name.toLowerCase().includes(searchKeyword.toLowerCase()) || d.code.toLowerCase().includes(searchKeyword.toLowerCase()));

  const stats = {
    total: departments.length,
    root: departments.filter((d) => d.parentId === null).length,
    users: departments.reduce((sum, d) => sum + d.userCount, 0),
  };

  const columns: TableColumn<Department>[] = [
    {
      key: "name",
      title: "部门名称",
      width: "250px",
      render: (row) => (
        <div className="flex items-center gap-2" style={{ paddingLeft: row.level * 24 }}>
          <button onClick={() => toggleExpand(row.id)} className="w-5 h-5 flex items-center justify-center">
            {departments.some((d) => d.parentId === row.id) ? expanded.has(row.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" /> : <span className="w-4" />}
          </button>
          <div className="w-7 h-7 rounded bg-blue-50 flex items-center justify-center text-blue-600">
            <Building2 className="h-3.5 w-3.5" />
          </div>
          <span className="font-medium text-[rgb(var(--admin-text-primary))]">{row.name}</span>
        </div>
      ),
    },
    {
      key: "code",
      title: "部门编码",
      width: "100px",
      render: (row) => <code className="text-xs bg-[rgb(var(--admin-bg-secondary))] px-2 py-1 rounded">{row.code}</code>,
    },
    {
      key: "manager",
      title: "负责人",
      width: "120px",
      render: (row) => (
        <div className="flex items-center gap-1">
          <UserCircle className="h-3.5 w-3.5 text-[rgb(var(--admin-text-secondary))]" />
          <span className="text-sm">{row.manager}</span>
        </div>
      ),
    },
    {
      key: "userCount",
      title: "人员数量",
      width: "90px",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <Users className="h-3.5 w-3.5 text-[rgb(var(--admin-text-secondary))]" />
          <span className="text-sm">{row.userCount}</span>
        </div>
      ),
    },
    {
      key: "isActive",
      title: "状态",
      width: "70px",
      align: "center",
      render: (row) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${row.isActive ? "text-green-600 bg-green-50" : "text-gray-600 bg-gray-50"}`}>
          {row.isActive ? "正常" : "停用"}
        </span>
      ),
    },
    {
      key: "actions",
      title: "操作",
      width: "120px",
      align: "center",
      render: () => (
        <div className="flex items-center justify-center gap-1">
          <AdminButton variant="link" size="sm">编辑</AdminButton>
          <AdminButton variant="link" size="sm">添加子部门</AdminButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Building2 className="h-6 w-6 text-[rgb(var(--admin-primary))]" />
        <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">部门管理</h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <AdminCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-[rgb(var(--admin-text-primary))]">{stats.total}</div>
            <div className="text-xs text-[rgb(var(--admin-text-secondary))]">部门总数</div>
          </div>
        </AdminCard>
        <AdminCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-[rgb(var(--admin-text-primary))]">{stats.users}</div>
            <div className="text-xs text-[rgb(var(--admin-text-secondary))]">部门人员</div>
          </div>
        </AdminCard>
        <AdminCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
            <span className="text-lg font-bold">{stats.root}</span>
          </div>
          <div>
            <div className="text-sm font-medium text-[rgb(var(--admin-text-primary))]">一级部门</div>
          </div>
        </AdminCard>
      </div>

      <AdminListPage<Department>
        title=""
        subtitle="管理企业组织架构，配置部门层级与人员关系"
        columns={columns}
        data={filteredDepartments}
        loading={false}
        searchKeyword={searchKeyword}
        onSearch={setSearchKeyword}
        onCreate={() => {}}
        createButtonText="新建部门"
        emptyText="暂无部门"
      />
    </div>
  );
}
