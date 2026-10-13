"use client";

import { useState, useCallback } from "react";
import { Layers, Tag, FileType, Image, Music, Video, Type, Sparkles } from "lucide-react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { useList, useDelete, apiKeys } from "@/hooks/useApi";
import { TableColumn } from "@/components/admin/shared/AdminTable";

interface CategoryRow {
  id: string;
  name: string;
  code: string;
  type: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  modelCount: number;
  createdAt: string;
}

const TYPE_LABELS: Record<string, { text: string; color: string; icon: React.ReactNode }> = {
  PROFESSIONAL: { text: "专业版", color: "text-purple-600 bg-purple-50", icon: <Sparkles className="h-4 w-4" /> },
  APPLICATION: { text: "应用版", color: "text-blue-600 bg-blue-50", icon: <Tag className="h-4 w-4" /> },
  TEXT: { text: "文字", color: "text-gray-600 bg-gray-50", icon: <Type className="h-4 w-4" /> },
  IMAGE: { text: "图片", color: "text-pink-600 bg-pink-50", icon: <Image className="h-4 w-4" /> },
  AUDIO: { text: "语音", color: "text-green-600 bg-green-50", icon: <Music className="h-4 w-4" /> },
  VIDEO: { text: "视频", color: "text-orange-600 bg-orange-50", icon: <Video className="h-4 w-4" /> },
  MULTIMODAL: { text: "多模态", color: "text-indigo-600 bg-indigo-50", icon: <FileType className="h-4 w-4" /> },
};

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  true: { text: "启用", color: "text-green-600 bg-green-50" },
  false: { text: "停用", color: "text-gray-600 bg-gray-50" },
};

export default function ModelCategoriesPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [typeFilter, setTypeFilter] = useState<string>("");

  const { items, pagination, isLoading, error, refresh } = useList<CategoryRow>(
    `/admin/models/categories?keyword=${searchKeyword}&page=${page}&limit=${pageSize}&type=${typeFilter}`,
    {
      params: { keyword: searchKeyword, page, limit: pageSize, type: typeFilter },
    }
  );

  const { mutate: deleteCategory } = useDelete("/admin/models/categories", {
    onSuccess: () => refresh(),
    invalidateKeys: [`/admin/models/categories`],
  });

  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    setPage(1);
  }, []);

  const stats = [
    { label: "专业版", value: items?.filter((i) => i.type === "PROFESSIONAL").length || 0, color: "purple" },
    { label: "应用版", value: items?.filter((i) => i.type === "APPLICATION").length || 0, color: "blue" },
    { label: "模态类型", value: items?.filter((i) => ["TEXT", "IMAGE", "AUDIO", "VIDEO", "MULTIMODAL"].includes(i.type)).length || 0, color: "green" },
  ];

  const columns: TableColumn<CategoryRow>[] = [
    {
      key: "name",
      title: "类型名称",
      width: "180px",
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-[rgb(var(--admin-text-primary))]">{row.name}</span>
        </div>
      ),
    },
    { key: "code", title: "类型代码", width: "120px" },
    {
      key: "type",
      title: "分类",
      width: "100px",
      render: (row) => {
        const t = TYPE_LABELS[row.type] || { text: row.type, color: "text-gray-600 bg-gray-50", icon: null };
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${t.color}`}>
            {t.icon}
            {t.text}
          </span>
        );
      },
    },
    {
      key: "modelCount",
      title: "模型数",
      width: "80px",
      align: "center",
      render: (row) => <span className="text-[rgb(var(--admin-text-primary))]">{row.modelCount}</span>,
    },
    {
      key: "sortOrder",
      title: "排序",
      width: "60px",
      align: "center",
      render: (row) => row.sortOrder,
    },
    {
      key: "isActive",
      title: "状态",
      width: "70px",
      render: (row) => {
        const s = STATUS_LABELS[String(row.isActive)];
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.color}`}>
            {s.text}
          </span>
        );
      },
    },
    {
      key: "actions",
      title: "操作",
      width: "120px",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <AdminButton variant="link" size="sm">编辑</AdminButton>
          <AdminButton
            variant="link"
            size="sm"
            className="text-[rgb(var(--admin-danger))] hover:text-[rgb(var(--admin-danger-hover))]"
            onClick={() => {
              if (confirm(`确认删除类型 ${row.name}？`)) {
                deleteCategory(row.id);
              }
            }}
          >
            删除
          </AdminButton>
        </div>
      ),
    },
  ];

  const filterBar = (
    <div className="flex items-center gap-4">
      <select
        value={typeFilter}
        onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
        className="px-3 py-1.5 text-sm border border-[rgb(var(--admin-border))] rounded-md bg-white"
      >
        <option value="">全部分类</option>
        <option value="PROFESSIONAL">专业版</option>
        <option value="APPLICATION">应用版</option>
        <option value="TEXT">文字</option>
        <option value="IMAGE">图片</option>
        <option value="AUDIO">语音</option>
        <option value="VIDEO">视频</option>
        <option value="MULTIMODAL">多模态</option>
      </select>
      {typeFilter && (
        <AdminButton variant="link" size="sm" onClick={() => { setTypeFilter(""); setPage(1); }}>
          清除筛选
        </AdminButton>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Layers className="h-6 w-6 text-[rgb(var(--admin-primary))]" />
        <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">类型管理</h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <AdminCard key={s.label} className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-${s.color}-50 flex items-center justify-center`}>
              <span className={`text-${s.color}-600 font-bold`}>{s.value}</span>
            </div>
            <span className="text-sm text-[rgb(var(--admin-text-secondary))]">{s.label}</span>
          </AdminCard>
        ))}
      </div>

      <AdminListPage<CategoryRow>
        title=""
        subtitle="管理模型的专业版/应用版分类以及模态类型"
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
        createButtonText="新建类型"
        emptyText="暂无类型数据"
        error={error}
      />
    </div>
  );
}
