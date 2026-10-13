"use client";

import { useState, useCallback } from "react";
import { Send, Bell, Mail, MessageSquare, CheckCircle, Clock } from "lucide-react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { TableColumn } from "@/components/admin/shared/AdminTable";

interface NotificationTemplate {
  id: string;
  name: string;
  type: "email" | "sms" | "push";
  subject: string;
  status: string;
  sendCount: number;
  updatedAt: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  sms: <MessageSquare className="h-4 w-4" />,
  push: <Bell className="h-4 w-4" />,
};

const TYPE_COLORS: Record<string, string> = {
  email: "text-blue-600 bg-blue-50",
  sms: "text-green-600 bg-green-50",
  push: "text-purple-600 bg-purple-50",
};

const TEMPLATES: NotificationTemplate[] = [
  { id: "1", name: "注册欢迎", type: "email", subject: "欢迎加入AIGC Platform", status: "active", sendCount: 1250, updatedAt: "2024-01-15" },
  { id: "2", name: "密码重置", type: "email", subject: "密码重置验证码", status: "active", sendCount: 86, updatedAt: "2024-01-14" },
  { id: "3", name: "任务完成", type: "push", subject: "您的任务已完成", status: "active", sendCount: 3420, updatedAt: "2024-01-15" },
  { id: "4", name: "系统公告", type: "email", subject: "系统维护通知", status: "draft", sendCount: 0, updatedAt: "2024-01-13" },
  { id: "5", name: "充值成功", type: "sms", subject: "充值成功提醒", status: "active", sendCount: 568, updatedAt: "2024-01-15" },
];

export default function NotificationSettingsPage() {
  const [templates] = useState(TEMPLATES);
  const [searchKeyword, setSearchKeyword] = useState("");

  const filteredTemplates = templates.filter((t) => t.name.toLowerCase().includes(searchKeyword.toLowerCase()));
  const activeCount = templates.filter((t) => t.status === "active").length;
  const totalSent = templates.reduce((sum, t) => sum + t.sendCount, 0);

  const columns: TableColumn<NotificationTemplate>[] = [
    {
      key: "type",
      title: "类型",
      width: "80px",
      render: (row) => (
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${TYPE_COLORS[row.type]}`}>{TYPE_ICONS[row.type]}</div>
      ),
    },
    {
      key: "name",
      title: "模板名称",
      width: "150px",
      render: (row) => <span className="font-medium text-[rgb(var(--admin-text-primary))]">{row.name}</span>,
    },
    { key: "subject", title: "主题", width: "250px" },
    {
      key: "status",
      title: "状态",
      width: "70px",
      render: (row) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${row.status === "active" ? "text-green-600 bg-green-50" : "text-gray-600 bg-gray-50"}`}>
          {row.status === "active" ? "启用" : "草稿"}
        </span>
      ),
    },
    {
      key: "sendCount",
      title: "发送次数",
      width: "90px",
      align: "center",
      render: (row) => <span className="text-sm">{row.sendCount.toLocaleString()}</span>,
    },
    {
      key: "updatedAt",
      title: "更新时间",
      width: "100px",
      render: (row) => <span className="text-sm text-[rgb(var(--admin-text-secondary))]">{row.updatedAt}</span>,
    },
    {
      key: "actions",
      title: "操作",
      width: "100px",
      align: "center",
      render: () => (
        <div className="flex items-center justify-center gap-1">
          <AdminButton variant="link" size="sm">编辑</AdminButton>
          <AdminButton variant="link" size="sm">测试</AdminButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Send className="h-6 w-6 text-[rgb(var(--admin-primary))]" />
        <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">消息推送</h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <AdminCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <Bell className="h-4 w-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-[rgb(var(--admin-text-primary))]">{templates.length}</div>
            <div className="text-xs text-[rgb(var(--admin-text-secondary))]">模板总数</div>
          </div>
        </AdminCard>
        <AdminCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
            <CheckCircle className="h-4 w-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-[rgb(var(--admin-text-primary))]">{activeCount}</div>
            <div className="text-xs text-[rgb(var(--admin-text-secondary))]">启用中</div>
          </div>
        </AdminCard>
        <AdminCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-[rgb(var(--admin-text-primary))]">{totalSent.toLocaleString()}</div>
            <div className="text-xs text-[rgb(var(--admin-text-secondary))]">总发送量</div>
          </div>
        </AdminCard>
      </div>

      <AdminListPage<NotificationTemplate>
        title=""
        subtitle="配置消息推送模板，管理推送记录与用户订阅"
        columns={columns}
        data={filteredTemplates}
        loading={false}
        searchKeyword={searchKeyword}
        onSearch={setSearchKeyword}
        onCreate={() => {}}
        createButtonText="新建模板"
        emptyText="暂无模板"
      />
    </div>
  );
}
