"use client";

import { useState, useCallback } from "react";
import { Newspaper, Eye, ThumbsUp, MessageSquare } from "lucide-react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { useList, useDelete } from "@/hooks/useApi";
import { TableColumn } from "@/components/admin/shared/AdminTable";

interface NewsRow {
  id: string;
  title: string;
  category: string;
  author: { id: string; name: string };
  status: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  publishedAt: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  DRAFT: { text: "草稿", color: "text-gray-600 bg-gray-50" },
  PUBLISHED: { text: "已发布", color: "text-green-600 bg-green-50" },
  ARCHIVED: { text: "已归档", color: "text-orange-600 bg-orange-50" },
};

const CATEGORY_LABELS: Record<string, string> = {
  INDUSTRY: "行业动态",
  PRODUCT: "产品更新",
  TECH: "技术文章",
  EVENT: "活动预告",
};

export default function NewsManagementPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { items, pagination, isLoading, error, refresh } = useList<NewsRow>(
    `/admin/content/news?keyword=${searchKeyword}&page=${page}&limit=${pageSize}`,
    { params: { keyword: searchKeyword, page, limit: pageSize } }
  );

  const { mutate: deleteNews } = useDelete("/admin/content/news", {
    onSuccess: () => refresh(),
    invalidateKeys: [`/admin/content/news`],
  });

  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    setPage(1);
  }, []);

  const totalViews = items?.reduce((sum, i) => sum + (i.viewCount || 0), 0) || 0;
  const totalLikes = items?.reduce((sum, i) => sum + (i.likeCount || 0), 0) || 0;

  const stats = [
    { label: "总浏览", value: totalViews.toLocaleString(), icon: <Eye className="h-4 w-4" />, color: "blue" },
    { label: "总点赞", value: totalLikes.toLocaleString(), icon: <ThumbsUp className="h-4 w-4" />, color: "green" },
    { label: "文章数", value: items?.length || 0, icon: <Newspaper className="h-4 w-4" />, color: "purple" },
  ];

  const columns: TableColumn<NewsRow>[] = [
    {
      key: "title",
      title: "标题",
      width: "280px",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-[rgb(var(--admin-text-primary))] truncate max-w-[260px] block">{row.title}</span>
          <span className="text-xs text-[rgb(var(--admin-text-secondary))]">{CATEGORY_LABELS[row.category] || row.category}</span>
        </div>
      ),
    },
    {
      key: "author",
      title: "作者",
      width: "100px",
      render: (row) => <span className="text-sm">{row.author?.name || "-"}</span>,
    },
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
    {
      key: "stats",
      title: "数据",
      width: "140px",
      render: (row) => (
        <div className="flex items-center gap-2 text-xs text-[rgb(var(--admin-text-secondary))]">
          <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" /> {row.viewCount || 0}</span>
          <span className="flex items-center gap-0.5"><ThumbsUp className="h-3 w-3" /> {row.likeCount || 0}</span>
        </div>
      ),
    },
    {
      key: "publishedAt",
      title: "发布时间",
      width: "130px",
      render: (row) => <span className="text-sm text-[rgb(var(--admin-text-secondary))]">{row.publishedAt ? new Date(row.publishedAt).toLocaleDateString() : "-"}</span>,
    },
    {
      key: "actions",
      title: "操作",
      width: "100px",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <AdminButton variant="link" size="sm">编辑</AdminButton>
          <AdminButton variant="link" size="sm" className="text-[rgb(var(--admin-danger))]" onClick={() => { if (confirm(`删除文章 ${row.title}？`)) deleteNews(row.id); }}>删除</AdminButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Newspaper className="h-6 w-6 text-[rgb(var(--admin-primary))]" />
        <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">资讯管理</h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
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

      <AdminListPage<NewsRow>
        title=""
        subtitle="管理平台资讯内容，编辑发布行业动态与技术文章"
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
        createButtonText="新建资讯"
        emptyText="暂无资讯文章"
        error={error}
      />
    </div>
  );
}
