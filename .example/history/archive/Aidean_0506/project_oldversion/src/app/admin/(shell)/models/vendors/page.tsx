"use client";

import { useState, useCallback } from "react";
import { Building2, Globe, Star } from "lucide-react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { useList, useDelete, apiKeys } from "@/hooks/useApi";
import { TableColumn } from "@/components/admin/shared/AdminTable";

interface VendorRow {
  id: string;
  name: string;
  code: string;
  description: string | null;
  website: string | null;
  logo: string | null;
  tier: string;
  isFeatured: boolean;
  modelCount: number;
  createdAt: string;
}

const TIER_LABELS: Record<string, { text: string; color: string }> = {
  TIER_1: { text: "T1-头部", color: "text-purple-600 bg-purple-50" },
  TIER_2: { text: "T2-主流", color: "text-blue-600 bg-blue-50" },
  TIER_3: { text: "T3-新兴", color: "text-green-600 bg-green-50" },
  TIER_4: { text: "T4-初创", color: "text-gray-600 bg-gray-50" },
};

export default function VendorsPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [tierFilter, setTierFilter] = useState<string>("");

  const { items, pagination, isLoading, error, refresh } = useList<VendorRow>(
    apiKeys.vendors({ keyword: searchKeyword, page, limit: pageSize, tier: tierFilter }),
    {
      params: { keyword: searchKeyword, page, limit: pageSize, tier: tierFilter },
    }
  );

  const { mutate: deleteVendor } = useDelete("/admin/models/vendors", {
    onSuccess: () => refresh(),
    invalidateKeys: [apiKeys.vendors()],
  });

  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    setPage(1);
  }, []);

  const clearFilters = () => {
    setTierFilter("");
    setPage(1);
  };

  const columns: TableColumn<VendorRow>[] = [
    {
      key: "name",
      title: "厂商名称",
      width: "200px",
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.logo ? (
            <img src={row.logo} alt={row.name} className="w-8 h-8 rounded object-contain bg-white border border-[rgb(var(--admin-border))]" />
          ) : (
            <div className="w-8 h-8 rounded bg-[rgb(var(--admin-bg-hover))] flex items-center justify-center">
              <Building2 className="h-4 w-4 text-[rgb(var(--admin-text-muted))]" />
            </div>
          )}
          <div>
            <div className="font-medium text-[rgb(var(--admin-text-primary))]">
              {row.name}
            </div>
            <div className="text-xs text-[rgb(var(--admin-text-muted))]">{row.code}</div>
          </div>
        </div>
      ),
    },
    {
      key: "tier",
      title: "层级",
      width: "100px",
      render: (row) => {
        const t = TIER_LABELS[row.tier] || { text: row.tier, color: "text-gray-600 bg-gray-50" };
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.color}`}>
            {t.text}
          </span>
        );
      },
    },
    {
      key: "modelCount",
      title: "模型数",
      width: "80px",
      align: "center" as const,
      render: (row) => (
        <span className="text-sm font-medium text-[rgb(var(--admin-text-primary))]">
          {row.modelCount}
        </span>
      ),
    },
    {
      key: "isFeatured",
      title: "精选",
      width: "60px",
      align: "center" as const,
      render: (row) =>
        row.isFeatured ? (
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mx-auto" />
        ) : (
          <span className="text-[rgb(var(--admin-text-muted))]">-</span>
        ),
    },
    {
      key: "website",
      title: "官网",
      width: "100px",
      render: (row) =>
        row.website ? (
          <a
            href={row.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-[rgb(var(--admin-primary))] hover:underline"
          >
            <Globe className="h-3 w-3" />
            访问
          </a>
        ) : (
          <span className="text-[rgb(var(--admin-text-muted))]">-</span>
        ),
    },
    {
      key: "actions",
      title: "操作",
      width: "120px",
      align: "center" as const,
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <AdminButton variant="link" size="sm">编辑</AdminButton>
          <AdminButton
            variant="link"
            size="sm"
            className="text-[rgb(var(--admin-danger))] hover:text-[rgb(var(--admin-danger-hover))]"
            onClick={() => {
              if (confirm(`确认删除厂商 ${row.name}？`)) {
                deleteVendor(row.id);
              }
            }}
          >
            删除
          </AdminButton>
        </div>
      ),
    },
  ];

  const hasFilters = tierFilter;

  return (
    <>
      <div className="space-y-4">
        {/* 筛选栏 */}
        <AdminCard className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium text-[rgb(var(--admin-text-primary))]">层级筛选:</span>
            <select
              value={tierFilter}
              onChange={(e) => {
                setTierFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-md border border-[rgb(var(--admin-border))] bg-[rgb(var(--admin-bg-sidebar))] text-sm text-[rgb(var(--admin-text-primary))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--admin-primary))]"
            >
              <option value="">所有层级</option>
              <option value="TIER_1">T1-头部</option>
              <option value="TIER_2">T2-主流</option>
              <option value="TIER_3">T3-新兴</option>
              <option value="TIER_4">T4-初创</option>
            </select>
            {hasFilters && (
              <AdminButton variant="ghost" size="sm" onClick={clearFilters}>
                清除筛选
              </AdminButton>
            )}
          </div>
        </AdminCard>

        {/* 厂商列表 */}
        <AdminListPage<VendorRow>
          title="厂商管理"
          subtitle="管理AI模型厂商信息"
          columns={columns}
          data={items}
          loading={isLoading}
          pagination={
            pagination
              ? {
                  page: pagination.page,
                  pageSize: pagination.limit,
                  total: pagination.total,
                  totalPages: pagination.totalPages,
                }
              : undefined
          }
          searchKeyword={searchKeyword}
          onSearch={handleSearch}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          onRefresh={refresh}
          onCreate={() => {
            // TODO: 打开创建厂商对话框
          }}
          createButtonText="新建厂商"
          emptyText="暂无厂商数据"
          error={error}
        />
      </div>
    </>
  );
}
