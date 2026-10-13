"use client";

import { useState, useCallback } from "react";
import { Link2, Building2, ArrowRight } from "lucide-react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { useList, useDelete } from "@/hooks/useApi";
import { TableColumn } from "@/components/admin/shared/AdminTable";

interface VendorRelationRow {
  id: string;
  fromVendor: { id: string; name: string };
  toVendor: { id: string; name: string };
  relationType: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

const RELATION_TYPE_LABELS: Record<string, { text: string; color: string }> = {
  SUBSIDIARY: { text: "子公司", color: "text-purple-600 bg-purple-50" },
  PARTNER: { text: "合作伙伴", color: "text-blue-600 bg-blue-50" },
  COMPETITOR: { text: "竞争对手", color: "text-orange-600 bg-orange-50" },
  AFFILIATE: { text: "关联公司", color: "text-green-600 bg-green-50" },
  INVESTMENT: { text: "投资关系", color: "text-pink-600 bg-pink-50" },
};

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  true: { text: "启用", color: "text-green-600 bg-green-50" },
  false: { text: "停用", color: "text-gray-600 bg-gray-50" },
};

export default function VendorRelationsPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [typeFilter, setTypeFilter] = useState<string>("");

  const { items, pagination, isLoading, error, refresh } = useList<VendorRelationRow>(
    `/admin/models/vendor-relations?keyword=${searchKeyword}&page=${page}&limit=${pageSize}&type=${typeFilter}`,
    {
      params: { keyword: searchKeyword, page, limit: pageSize, type: typeFilter },
    }
  );

  const { mutate: deleteRelation } = useDelete("/admin/models/vendor-relations", {
    onSuccess: () => refresh(),
    invalidateKeys: [`/admin/models/vendor-relations`],
  });

  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    setPage(1);
  }, []);

  const columns: TableColumn<VendorRelationRow>[] = [
    {
      key: "fromVendor",
      title: "厂商A",
      width: "150px",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-[rgb(var(--admin-text-secondary))]" />
          <span className="font-medium text-[rgb(var(--admin-text-primary))]">{row.fromVendor?.name || "-"}</span>
        </div>
      ),
    },
    {
      key: "relation",
      title: "关系",
      width: "120px",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <ArrowRight className="h-4 w-4 text-[rgb(var(--admin-primary))]" />
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${RELATION_TYPE_LABELS[row.relationType]?.color || "text-gray-600 bg-gray-50"}`}>
            {RELATION_TYPE_LABELS[row.relationType]?.text || row.relationType}
          </span>
        </div>
      ),
    },
    {
      key: "toVendor",
      title: "厂商B",
      width: "150px",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-[rgb(var(--admin-text-secondary))]" />
          <span className="font-medium text-[rgb(var(--admin-text-primary))]">{row.toVendor?.name || "-"}</span>
        </div>
      ),
    },
    {
      key: "description",
      title: "说明",
      width: "200px",
      render: (row) => (
        <span className="text-sm text-[rgb(var(--admin-text-secondary))] truncate max-w-[180px] block">
          {row.description || "-"}
        </span>
      ),
    },
    {
      key: "isActive",
      title: "状态",
      width: "70px",
      render: (row) => {
        const s = STATUS_LABELS[String(row.isActive)];
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s?.color || "text-gray-600 bg-gray-50"}`}>
            {s?.text || "-"}
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
              if (confirm(`确认删除厂商关联？`)) {
                deleteRelation(row.id);
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
        <option value="">全部关系</option>
        <option value="SUBSIDIARY">子公司</option>
        <option value="PARTNER">合作伙伴</option>
        <option value="COMPETITOR">竞争对手</option>
        <option value="AFFILIATE">关联公司</option>
        <option value="INVESTMENT">投资关系</option>
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
        <Link2 className="h-6 w-6 text-[rgb(var(--admin-primary))]" />
        <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">厂商关联</h1>
      </div>

      <AdminListPage<VendorRelationRow>
        title=""
        subtitle="管理模型厂商之间的关联关系（子公司、合作伙伴、竞争对手等）"
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
        createButtonText="新建关联"
        emptyText="暂无厂商关联数据"
        error={error}
      />
    </div>
  );
}
