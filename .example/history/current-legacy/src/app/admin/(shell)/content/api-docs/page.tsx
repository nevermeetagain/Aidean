"use client";

import { useState, useCallback } from "react";
import { BookMarked, Code, FileJson, Globe } from "lucide-react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { useList, useDelete } from "@/hooks/useApi";
import { TableColumn } from "@/components/admin/shared/AdminTable";

interface ApiDocRow {
  id: string;
  name: string;
  path: string;
  method: string;
  version: string;
  status: string;
  description: string | null;
  updatedAt: string;
}

const METHOD_LABELS: Record<string, { text: string; color: string }> = {
  GET: { text: "GET", color: "text-green-600 bg-green-50" },
  POST: { text: "POST", color: "text-blue-600 bg-blue-50" },
  PUT: { text: "PUT", color: "text-orange-600 bg-orange-50" },
  DELETE: { text: "DELETE", color: "text-red-600 bg-red-50" },
  PATCH: { text: "PATCH", color: "text-purple-600 bg-purple-50" },
};

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  ACTIVE: { text: "可用", color: "text-green-600 bg-green-50" },
  DEPRECATED: { text: "废弃", color: "text-orange-600 bg-orange-50" },
  BETA: { text: "测试", color: "text-yellow-600 bg-yellow-50" },
};

export default function ApiDocsPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { items, pagination, isLoading, error, refresh } = useList<ApiDocRow>(
    `/admin/content/api-docs?keyword=${searchKeyword}&page=${page}&limit=${pageSize}`,
    { params: { keyword: searchKeyword, page, limit: pageSize } }
  );

  const { mutate: deleteDoc } = useDelete("/admin/content/api-docs", {
    onSuccess: () => refresh(),
    invalidateKeys: [`/admin/content/api-docs`],
  });

  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    setPage(1);
  }, []);

  const activeCount = items?.filter((i) => i.status === "ACTIVE").length || 0;

  const stats = [
    { label: "总接口", value: items?.length || 0, icon: <Code className="h-4 w-4" />, color: "blue" },
    { label: "可用接口", value: activeCount, icon: <FileJson className="h-4 w-4" />, color: "green" },
  ];

  const columns: TableColumn<ApiDocRow>[] = [
    {
      key: "name",
      title: "接口名称",
      width: "200px",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-[rgb(var(--admin-text-primary))]">{row.name}</span>
          <span className="text-xs text-[rgb(var(--admin-text-secondary))]">{row.path}</span>
        </div>
      ),
    },
    {
      key: "method",
      title: "方法",
      width: "70px",
      render: (row) => {
        const m = METHOD_LABELS[row.method];
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${m?.color || "text-gray-600 bg-gray-50"}`}>
            {m?.text || row.method}
          </span>
        );
      },
    },
    { key: "version", title: "版本", width: "60px", align: "center" },
    {
      key: "status",
      title: "状态",
      width: "70px",
      render: (row) => {
        const s = STATUS_LABELS[row.status];
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s?.color || "text-gray-600 bg-gray-50"}`}>
            {s?.text || row.status}
          </span>
        );
      },
    },
    {
      key: "description",
      title: "描述",
      width: "200px",
      render: (row) => <span className="text-sm text-[rgb(var(--admin-text-secondary))] truncate max-w-[180px] block">{row.description || "-"}</span>,
    },
    {
      key: "updatedAt",
      title: "更新时间",
      width: "140px",
      render: (row) => <span className="text-sm text-[rgb(var(--admin-text-secondary))]">{new Date(row.updatedAt).toLocaleString()}</span>,
    },
    {
      key: "actions",
      title: "操作",
      width: "100px",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <AdminButton variant="link" size="sm">编辑</AdminButton>
          <AdminButton variant="link" size="sm" className="text-[rgb(var(--admin-danger))]" onClick={() => { if (confirm(`删除接口 ${row.name}？`)) deleteDoc(row.id); }}>删除</AdminButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BookMarked className="h-6 w-6 text-[rgb(var(--admin-primary))]" />
        <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">API文档管理</h1>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {stats.map((s) => (
          <AdminCard key={s.label} className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-${s.color}-50 flex items-center justify-center text-${s.color}-600`}>{s.icon}</div>
            <div>
              <div className="text-lg font-bold text-[rgb(var(--admin-text-primary))]">{s.value}</div>
              <div className="text-xs text-[rgb(var(--admin-text-secondary))]">{s.label}</div>
            </div>
          </AdminCard>
        ))}
      </div>

      <AdminListPage<ApiDocRow>
        title=""
        subtitle="管理平台API文档，编辑接口说明与示例代码"
        columns={columns}
        data={items}
        loading={isLoading}
        pagination={pagination ? { page: pagination.page, pageSize: pagination.limit, total: pagination.total, totalPages: pagination.totalPages } : undefined}
        searchKeyword={searchKeyword}
        onSearch={handleSearch}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        onRefresh={refresh}
        onCreate={() => {}}
        createButtonText="新建接口"
        emptyText="暂无API文档"
        error={error}
      />
    </div>
  );
}
