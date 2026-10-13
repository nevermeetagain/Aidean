"use client";

import { useState, useCallback } from "react";
import { Megaphone, Pin, Globe, Bell } from "lucide-react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { useList, useDelete } from "@/hooks/useApi";
import { TableColumn } from "@/components/admin/shared/AdminTable";

interface AnnouncementRow {
  id: string;
  title: string;
  content: string;
  type: string;
  isPinned: boolean;
  isGlobal: boolean;
  startAt: string;
  endAt: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, { text: string; color: string }> = {
  SYSTEM: { text: "系统", color: "text-blue-600 bg-blue-50" },
  UPDATE: { text: "更新", color: "text-green-600 bg-green-50" },
  MAINTENANCE: { text: "维护", color: "text-orange-600 bg-orange-50" },
  PROMOTION: { text: "活动", color: "text-purple-600 bg-purple-50" },
};

export default function AnnouncementsPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { items, pagination, isLoading, error, refresh } = useList<AnnouncementRow>(
    `/admin/content/announcements?keyword=${searchKeyword}&page=${page}&limit=${pageSize}`,
    { params: { keyword: searchKeyword, page, limit: pageSize } }
  );

  const { mutate: deleteAnnouncement } = useDelete("/admin/content/announcements", {
    onSuccess: () => refresh(),
    invalidateKeys: [`/admin/content/announcements`],
  });

  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    setPage(1);
  }, []);

  const pinnedCount = items?.filter((i) => i.isPinned).length || 0;
  const activeCount = items?.filter((i) => {
    const now = new Date();
    const start = i.startAt ? new Date(i.startAt) : null;
    const end = i.endAt ? new Date(i.endAt) : null;
    return (!start || start <= now) && (!end || end >= now);
  }).length || 0;

  const stats = [
    { label: "总公告", value: items?.length || 0, icon: <Megaphone className="h-4 w-4" />, color: "blue" },
    { label: "置顶", value: pinnedCount, icon: <Pin className="h-4 w-4" />, color: "orange" },
    { label: "进行中", value: activeCount, icon: <Bell className="h-4 w-4" />, color: "green" },
  ];

  const columns: TableColumn<AnnouncementRow>[] = [
    {
      key: "title",
      title: "标题",
      width: "300px",
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.isPinned && <Pin className="h-3 w-3 text-orange-500" />}
          {row.isGlobal && <Globe className="h-3 w-3 text-blue-500" />}
          <span className="font-medium text-[rgb(var(--admin-text-primary))] truncate max-w-[240px] block">{row.title}</span>
        </div>
      ),
    },
    {
      key: "type",
      title: "类型",
      width: "70px",
      render: (row) => {
        const t = TYPE_LABELS[row.type];
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t?.color || "text-gray-600 bg-gray-50"}`}>
            {t?.text || row.type}
          </span>
        );
      },
    },
    {
      key: "period",
      title: "有效期",
      width: "180px",
      render: (row) => (
        <span className="text-sm text-[rgb(var(--admin-text-secondary))]">
          {new Date(row.startAt).toLocaleDateString()} - {row.endAt ? new Date(row.endAt).toLocaleDateString() : "永久"}
        </span>
      ),
    },
    {
      key: "createdAt",
      title: "创建时间",
      width: "130px",
      render: (row) => <span className="text-sm text-[rgb(var(--admin-text-secondary))]">{new Date(row.createdAt).toLocaleString()}</span>,
    },
    {
      key: "actions",
      title: "操作",
      width: "100px",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <AdminButton variant="link" size="sm">编辑</AdminButton>
          <AdminButton variant="link" size="sm" className="text-[rgb(var(--admin-danger))]" onClick={() => { if (confirm(`删除公告 ${row.title}？`)) deleteAnnouncement(row.id); }}>删除</AdminButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Megaphone className="h-6 w-6 text-[rgb(var(--admin-primary))]" />
        <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">公告管理</h1>
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

      <AdminListPage<AnnouncementRow>
        title=""
        subtitle="管理系统公告，支持置顶与全站推送"
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
        createButtonText="新建公告"
        emptyText="暂无公告"
        error={error}
      />
    </div>
  );
}
