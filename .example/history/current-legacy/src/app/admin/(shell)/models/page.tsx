"use client";

import { useState, useCallback } from "react";
import { Filter, Plus } from "lucide-react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { useList, useDelete, useCreate, apiKeys } from "@/hooks/useApi";
import { TableColumn } from "@/components/admin/shared/AdminTable";
import { ModelFormModal, ModelFormData } from "@/components/admin/models/ModelFormModal";

interface AiModelRow {
  id: string;
  modelCode: string;
  nameDisplay: string;
  nameCn: string | null;
  modelType: string;
  status: string;
  vendor: { id: string; name: string } | null;
  isOpenSource: boolean;
  isActive: boolean;
  createdAt: string;
}

const MODEL_TYPE_LABELS: Record<string, string> = {
  CHAT: "对话",
  REASONING: "推理",
  MULTIMODAL: "多模态",
  CODE: "代码",
  VISION: "视觉",
  AUDIO: "语音",
  EMBEDDING: "嵌入",
  RERANK: "排序",
  ASR: "语音识别",
  TTS: "语音合成",
};

const STATUS_LABELS: Record<string, { text: string; color: string }> = {
  ACTIVE: { text: "活跃", color: "text-green-600 bg-green-50" },
  INACTIVE: { text: "停用", color: "text-gray-600 bg-gray-50" },
  DEPRECATED: { text: "废弃", color: "text-red-600 bg-red-50" },
  BETA: { text: "测试", color: "text-yellow-600 bg-yellow-50" },
};

export default function ModelsPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [modelTypeFilter, setModelTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Partial<ModelFormData> | undefined>();

  const { items, pagination, isLoading, error, refresh } = useList<AiModelRow>(
    apiKeys.models({ keyword: searchKeyword, page, limit: pageSize, modelType: modelTypeFilter, status: statusFilter }),
    {
      params: { keyword: searchKeyword, page, limit: pageSize, modelType: modelTypeFilter, status: statusFilter },
    }
  );

  const { mutate: deleteModel } = useDelete("/admin/models", {
    onSuccess: () => refresh(),
    invalidateKeys: [apiKeys.models()],
  });

  const { mutate: createModel, isLoading: isCreating } = useCreate("/admin/models", {
    onSuccess: () => {
      setIsModalOpen(false);
      setEditingModel(undefined);
      refresh();
    },
    invalidateKeys: [apiKeys.models()],
  });

  const handleSearch = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    setPage(1);
  }, []);

  const handleCreate = () => {
    setEditingModel(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (row: AiModelRow) => {
    setEditingModel({
      id: row.id,
      modelCode: row.modelCode,
      nameDisplay: row.nameDisplay,
      nameCn: row.nameCn || "",
      modelType: row.modelType,
      vendorId: row.vendor?.id || "",
      status: row.status,
      isOpenSource: row.isOpenSource,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (data: ModelFormData) => {
    if (data.id) {
      // TODO: 更新模型
    } else {
      createModel(data);
    }
  };

  const clearFilters = () => {
    setModelTypeFilter("");
    setStatusFilter("");
    setPage(1);
  };

  const columns: TableColumn<AiModelRow>[] = [
    {
      key: "nameDisplay",
      title: "模型名称",
      width: "200px",
      render: (row) => (
        <div>
          <div className="font-medium text-[rgb(var(--admin-text-primary))]">
            {row.nameDisplay}
          </div>
          {row.nameCn && (
            <div className="text-xs text-[rgb(var(--admin-text-muted))]">
              {row.nameCn}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "modelCode",
      title: "模型代码",
      width: "140px",
      render: (row) => (
        <code className="text-xs px-1.5 py-0.5 rounded bg-[rgb(var(--admin-bg))] text-[rgb(var(--admin-text-secondary))]">
          {row.modelCode}
        </code>
      ),
    },
    {
      key: "vendor",
      title: "厂商",
      width: "100px",
      render: (row) => row.vendor?.name || "-",
    },
    {
      key: "modelType",
      title: "类型",
      width: "80px",
      render: (row) => MODEL_TYPE_LABELS[row.modelType] || row.modelType,
    },
    {
      key: "status",
      title: "状态",
      width: "70px",
      render: (row) => {
        const s = STATUS_LABELS[row.status] || { text: row.status, color: "text-gray-600 bg-gray-50" };
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.color}`}>
            {s.text}
          </span>
        );
      },
    },
    {
      key: "isOpenSource",
      title: "开源",
      width: "60px",
      align: "center" as const,
      render: (row) =>
        row.isOpenSource ? (
          <span className="text-green-600">是</span>
        ) : (
          <span className="text-[rgb(var(--admin-text-muted))]">否</span>
        ),
    },
    {
      key: "actions",
      title: "操作",
      width: "120px",
      align: "center" as const,
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <AdminButton variant="link" size="sm" onClick={() => handleEdit(row)}>
            编辑
          </AdminButton>
          <AdminButton
            variant="link"
            size="sm"
            className="text-[rgb(var(--admin-danger))] hover:text-[rgb(var(--admin-danger-hover))]"
            onClick={() => {
              if (confirm(`确认删除模型 ${row.nameDisplay}？`)) {
                deleteModel(row.id);
              }
            }}
          >
            删除
          </AdminButton>
        </div>
      ),
    },
  ];

  const hasFilters = modelTypeFilter || statusFilter;

  return (
    <>
      <div className="space-y-4">
        {/* 筛选栏 */}
        <AdminCard className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[rgb(var(--admin-text-muted))]" />
              <span className="text-sm font-medium text-[rgb(var(--admin-text-primary))]">筛选条件:</span>
            </div>
            
            <div className="flex items-center gap-2">
              <select
                value={modelTypeFilter}
                onChange={(e) => {
                  setModelTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-md border border-[rgb(var(--admin-border))] bg-[rgb(var(--admin-bg-sidebar))] text-sm text-[rgb(var(--admin-text-primary))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--admin-primary))]"
              >
                <option value="">所有类型</option>
                {Object.entries(MODEL_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-md border border-[rgb(var(--admin-border))] bg-[rgb(var(--admin-bg-sidebar))] text-sm text-[rgb(var(--admin-text-primary))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--admin-primary))]"
              >
                <option value="">所有状态</option>
                <option value="ACTIVE">活跃</option>
                <option value="INACTIVE">停用</option>
                <option value="DEPRECATED">废弃</option>
                <option value="BETA">测试</option>
              </select>
            </div>

            {hasFilters && (
              <AdminButton variant="ghost" size="sm" onClick={clearFilters}>
                清除筛选
              </AdminButton>
            )}
          </div>
        </AdminCard>

        {/* 模型列表 */}
        <AdminListPage<AiModelRow>
          title="模型管理"
          subtitle="管理所有AI模型信息、配置与状态"
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
          onCreate={handleCreate}
          createButtonText="新建模型"
          emptyText="暂无模型数据"
          error={error}
        />
      </div>

      {/* 创建/编辑弹窗 */}
      <ModelFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingModel(undefined);
        }}
        onSubmit={handleSubmit}
        initialData={editingModel}
        isLoading={isCreating}
      />
    </>
  );
}
