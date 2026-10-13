"use client";

import { useState, useCallback } from "react";
import { Users2, Users, UserPlus, Star, ArrowRight } from "lucide-react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { TableColumn } from "@/components/admin/shared/AdminTable";

interface Team {
  id: string;
  name: string;
  description: string;
  leader: string;
  members: string[];
  department: string;
  projectCount: number;
  isActive: boolean;
  createdAt: string;
}

const TEAMS: Team[] = [
  { id: "1", name: "AI模型评测组", description: "负责模型能力评估与对比", leader: "张三", members: ["李四", "王五", "赵六"], department: "技术部", projectCount: 5, isActive: true, createdAt: "2024-01-01" },
  { id: "2", name: "前端架构组", description: "前端技术架构设计与优化", leader: "李四", members: ["王五", "孙七"], department: "技术部", projectCount: 3, isActive: true, createdAt: "2024-01-02" },
  { id: "3", name: "内容运营组", description: "负责资讯内容与社区运营", leader: "钱七", members: ["孙八", "周九"], department: "运营部", projectCount: 8, isActive: true, createdAt: "2024-01-03" },
  { id: "4", name: "产品设计组", description: "产品交互与视觉设计", leader: "周九", members: ["吴十", "郑一"], department: "产品部", projectCount: 4, isActive: true, createdAt: "2024-01-04" },
  { id: "5", name: "数据洞察组", description: "数据分析与业务洞察", leader: "郑一", members: ["冯二"], department: "技术部", projectCount: 6, isActive: false, createdAt: "2024-01-05" },
];

export default function TeamsPage() {
  const [teams] = useState(TEAMS);
  const [searchKeyword, setSearchKeyword] = useState("");

  const filteredTeams = teams.filter((t) => t.name.toLowerCase().includes(searchKeyword.toLowerCase()) || t.description.toLowerCase().includes(searchKeyword.toLowerCase()));

  const stats = {
    total: teams.length,
    active: teams.filter((t) => t.isActive).length,
    members: teams.reduce((sum, t) => sum + t.members.length, 0),
    projects: teams.reduce((sum, t) => sum + t.projectCount, 0),
  };

  const columns: TableColumn<Team>[] = [
    {
      key: "name",
      title: "团队名称",
      width: "180px",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
            <Users2 className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <span className="font-medium text-[rgb(var(--admin-text-primary))]">{row.name}</span>
        </div>
      ),
    },
    { key: "description", title: "描述", width: "220px" },
    {
      key: "department",
      title: "所属部门",
      width: "100px",
      render: (row) => <span className="text-sm text-[rgb(var(--admin-text-secondary))]">{row.department}</span>,
    },
    {
      key: "leader",
      title: "团队负责人",
      width: "100px",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
          <span className="text-sm">{row.leader}</span>
        </div>
      ),
    },
    {
      key: "members",
      title: "成员数量",
      width: "90px",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <Users className="h-3.5 w-3.5 text-[rgb(var(--admin-text-secondary))]" />
          <span className="text-sm">{row.members.length}</span>
        </div>
      ),
    },
    {
      key: "projectCount",
      title: "项目数",
      width: "70px",
      align: "center",
      render: (row) => <span className="text-sm text-[rgb(var(--admin-primary))]">{row.projectCount}</span>,
    },
    {
      key: "isActive",
      title: "状态",
      width: "70px",
      align: "center",
      render: (row) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${row.isActive ? "text-green-600 bg-green-50" : "text-gray-600 bg-gray-50"}`}>
          {row.isActive ? "活跃" : "停用"}
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
          <AdminButton variant="link" size="sm">
            成员 <ArrowRight className="h-3 w-3" />
          </AdminButton>
          <AdminButton variant="link" size="sm">编辑</AdminButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users2 className="h-6 w-6 text-[rgb(var(--admin-primary))]" />
        <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">团队管理</h1>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <AdminCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <Users2 className="h-4 w-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-[rgb(var(--admin-text-primary))]">{stats.total}</div>
            <div className="text-xs text-[rgb(var(--admin-text-secondary))]">团队总数</div>
          </div>
        </AdminCard>
        <AdminCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-[rgb(var(--admin-text-primary))]">{stats.members}</div>
            <div className="text-xs text-[rgb(var(--admin-text-secondary))]">团队人数</div>
          </div>
        </AdminCard>
        <AdminCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
            <span className="text-lg font-bold">{stats.projects}</span>
          </div>
          <div>
            <div className="text-sm font-medium text-[rgb(var(--admin-text-primary))]">项目总数</div>
          </div>
        </AdminCard>
        <AdminCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center text-yellow-600">
            <UserPlus className="h-4 w-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-[rgb(var(--admin-text-primary))]">{stats.active}</div>
            <div className="text-xs text-[rgb(var(--admin-text-secondary))]">活跃团队</div>
          </div>
        </AdminCard>
      </div>

      <AdminListPage<Team>
        title=""
        subtitle="管理团队配置，分配成员与项目资源"
        columns={columns}
        data={filteredTeams}
        loading={false}
        searchKeyword={searchKeyword}
        onSearch={setSearchKeyword}
        onCreate={() => {}}
        createButtonText="新建团队"
        emptyText="暂无团队"
      />
    </div>
  );
}
