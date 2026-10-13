"use client";

import { useState, useCallback } from "react";
import { ScrollText, Download, Trash2, Search, Filter } from "lucide-react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { TableColumn } from "@/components/admin/shared/AdminTable";

interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error";
  user: string;
  action: string;
  resource: string;
  ip: string;
  details: string;
}

const LOGS: LogEntry[] = [
  { id: "1", timestamp: "2024-01-15 10:30:25", level: "info", user: "admin@example.com", action: "登录", resource: "系统", ip: "192.168.1.1", details: "管理员登录成功" },
  { id: "2", timestamp: "2024-01-15 10:25:12", level: "info", user: "admin@example.com", action: "更新", resource: "模型", ip: "192.168.1.1", details: "更新模型 GPT-4 信息" },
  { id: "3", timestamp: "2024-01-15 09:45:33", level: "warn", user: "user@example.com", action: "导出", resource: "数据", ip: "192.168.1.2", details: "大量数据导出请求" },
  { id: "4", timestamp: "2024-01-15 09:30:00", level: "error", user: "system", action: "同步", resource: "厂商", ip: "-", details: "厂商数据同步失败" },
  { id: "5", timestamp: "2024-01-15 08:15:45", level: "info", user: "admin@example.com", action: "创建", resource: "公告", ip: "192.168.1.1", details: "创建系统公告" },
];

const LEVEL_COLORS: Record<string, string> = {
  info: "text-blue-600 bg-blue-50",
  warn: "text-yellow-600 bg-yellow-50",
  error: "text-red-600 bg-red-50",
};

const LEVEL_LABELS: Record<string, string> = {
  info: "信息",
  warn: "警告",
  error: "错误",
};

export default function SystemLogsPage() {
  const [logs] = useState(LOGS);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("");

  const filteredLogs = logs.filter((log) => {
    const matchKeyword = log.user.toLowerCase().includes(searchKeyword.toLowerCase()) || log.action.includes(searchKeyword) || log.details.includes(searchKeyword);
    const matchLevel = levelFilter ? log.level === levelFilter : true;
    return matchKeyword && matchLevel;
  });

  const stats = {
    total: logs.length,
    info: logs.filter((l) => l.level === "info").length,
    warn: logs.filter((l) => l.level === "warn").length,
    error: logs.filter((l) => l.level === "error").length,
  };

  const columns: TableColumn<LogEntry>[] = [
    {
      key: "timestamp",
      title: "时间",
      width: "150px",
      render: (row) => <span className="text-sm text-[rgb(var(--admin-text-secondary))]">{row.timestamp}</span>,
    },
    {
      key: "level",
      title: "级别",
      width: "70px",
      render: (row) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${LEVEL_COLORS[row.level]}`}>
          {LEVEL_LABELS[row.level]}
        </span>
      ),
    },
    {
      key: "user",
      title: "用户",
      width: "150px",
      render: (row) => <span className="text-sm text-[rgb(var(--admin-text-primary))]">{row.user}</span>,
    },
    {
      key: "action",
      title: "操作",
      width: "80px",
      render: (row) => <span className="text-sm">{row.action}</span>,
    },
    {
      key: "resource",
      title: "资源",
      width: "80px",
      render: (row) => <span className="text-sm text-[rgb(var(--admin-text-secondary))]">{row.resource}</span>,
    },
    {
      key: "ip",
      title: "IP地址",
      width: "100px",
      render: (row) => <code className="text-xs bg-[rgb(var(--admin-bg-secondary))] px-2 py-0.5 rounded">{row.ip}</code>,
    },
    {
      key: "details",
      title: "详情",
      width: "200px",
      render: (row) => <span className="text-sm text-[rgb(var(--admin-text-secondary))] truncate">{row.details}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScrollText className="h-6 w-6 text-[rgb(var(--admin-primary))]" />
          <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">日志查看</h1>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center px-3 py-1.5 text-sm border border-[rgb(var(--admin-border))] rounded-md hover:bg-[rgb(var(--admin-bg-secondary))]">
            <Download className="h-4 w-4 mr-1" /> 导出
          </button>
          <button className="flex items-center px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-md hover:bg-red-50">
            <Trash2 className="h-4 w-4 mr-1" /> 清空
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <AdminCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600">
            <span className="text-lg font-bold">{stats.total}</span>
          </div>
          <div>
            <div className="text-sm font-medium text-[rgb(var(--admin-text-primary))]">总日志数</div>
          </div>
        </AdminCard>
        <AdminCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <span className="text-lg font-bold">{stats.info}</span>
          </div>
          <div>
            <div className="text-sm font-medium text-[rgb(var(--admin-text-primary))]">信息</div>
          </div>
        </AdminCard>
        <AdminCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center text-yellow-600">
            <span className="text-lg font-bold">{stats.warn}</span>
          </div>
          <div>
            <div className="text-sm font-medium text-[rgb(var(--admin-text-primary))]">警告</div>
          </div>
        </AdminCard>
        <AdminCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
            <span className="text-lg font-bold">{stats.error}</span>
          </div>
          <div>
            <div className="text-sm font-medium text-[rgb(var(--admin-text-primary))]">错误</div>
          </div>
        </AdminCard>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[rgb(var(--admin-text-secondary))]" />
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="text-sm border rounded px-2 py-1">
            <option value="">全部级别</option>
            <option value="info">信息</option>
            <option value="warn">警告</option>
            <option value="error">错误</option>
          </select>
        </div>
      </div>

      <AdminListPage<LogEntry>
        title=""
        subtitle="查看系统操作日志，支持按时间、用户、操作类型筛选"
        columns={columns}
        data={filteredLogs}
        loading={false}
        searchKeyword={searchKeyword}
        onSearch={setSearchKeyword}
        emptyText="暂无日志"
      />
    </div>
  );
}
