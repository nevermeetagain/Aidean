"use client";

import { useState, useCallback } from "react";
import { FileText, BookOpen, FolderOpen } from "lucide-react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { useList, useDelete } from "@/hooks/useApi";
import { TableColumn } from "@/components/admin/shared/AdminTable";

interface DocRow {
  id: string;
  title: string;
  slug: string;
  category: string;
  status: string;
  sortOrder: number;
  updatedAt: string;
}

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  DRAFT: { text: "草稿", color: "text-gray-600 bg-gray-50" },
  PUBLISHED: { text: "已发布", color: "text-green-600 bg-green-50" },
};

export default function DocsManagementPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { items, pagination, isLoading, error, refresh } = useList<DocRow>(
    `/admin/content/docs?keyword=${searchKeyword}&page=${page}&limit=${pageSize}`,
    { params: { keyword: searchKeyword, page, limit: pageSize } }
  );

  const { mutate: deleteDoc } = useDelete("/admin/content/docs", {
    onSuccess: () => refresh(),
    invalidateKeys: [`/admin/content/docs`],
  });

  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    setPage(1);
  }, []);

  const publishedCount = items?.filter((i) => i.status === "PUBLISHED").length || 0;

  const stats = [
    { label: "总文档", value: items?.length || 0, icon: <FileText className="h-4 w-4" />, color: "blue" },
    { label: "已发布", value: publishedCount, icon: <BookOpen className="h-4 w-4" />, color: "green" },
  ];

  const columns: TableColumn<DocRow>[] = [
    {
      key: "title",
      title: "标题",
      width: "280px",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-[rgb(var(--admin-text-primary))]">{row.title}</span>
          <span className="text-xs text-[rgb(var(--admin-text-secondary))]">/{row.slug}</span>
        </div>
      ),
    },
    { key: "category", title: "分类", width: "120px" },
    {
      key: "status",
      title: "状态",
      width: "80px",
      render: (row) => {
        const s = STATUS_LABELS[row.status];
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s?.color || "text-gray-600 bg-gray-50"}`}>
            {s?.text || row.status}
          </span>
        );
      },
    },
    { key: "sortOrder", title: "排序", width: "60px", align: "center" },
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
          <AdminButton variant="link" size="sm" className="text-[rgb(var(--admin-danger))]" onClick={() => { if (confirm(`删除文档 ${row.title}？`)) deleteDoc(row.id); }}>删除</AdminButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FolderOpen className="h-6 w-6 text-[rgb(var(--admin-primary))]" />
        <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">文档管理</h1>
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

      <AdminListPage<DocRow>
        title=""
        subtitle="管理平台帮助文档与说明内容"
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
        createButtonText="新建文档"
        emptyText="暂无文档"
        error={error}
      />
    </div>
  );
}
