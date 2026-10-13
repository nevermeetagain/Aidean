"use client";

import { useState, useCallback } from "react";
import { BookOpen, Plus, ChevronRight, X } from "lucide-react";
import { AdminListPage } from "@/components/admin/shared/AdminListPage";
import { AdminCard } from "@/components/admin/shared/AdminCard";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { TableColumn } from "@/components/admin/shared/AdminTable";

interface DictType {
  id: string;
  code: string;
  name: string;
  description: string;
  itemCount: number;
  isActive: boolean;
  createdAt: string;
}

interface DictItem {
  id: string;
  typeCode: string;
  label: string;
  value: string;
  sortOrder: number;
  isActive: boolean;
}

const DICT_TYPES: DictType[] = [
  { id: "1", code: "model_type", name: "模型类型", description: "AI模型分类", itemCount: 5, isActive: true, createdAt: "2024-01-01" },
  { id: "2", code: "vendor_tier", name: "厂商层级", description: "厂商分层等级", itemCount: 4, isActive: true, createdAt: "2024-01-01" },
  { id: "3", code: "content_status", name: "内容状态", description: "内容发布状态", itemCount: 3, isActive: true, createdAt: "2024-01-01" },
  { id: "4", code: "order_status", name: "订单状态", description: "订单处理状态", itemCount: 6, isActive: true, createdAt: "2024-01-01" },
  { id: "5", code: "task_priority", name: "任务优先级", description: "任务执行优先级", itemCount: 5, isActive: true, createdAt: "2024-01-01" },
];

const DICT_ITEMS: Record<string, DictItem[]> = {
  model_type: [
    { id: "1", typeCode: "model_type", label: "大语言模型", value: "llm", sortOrder: 1, isActive: true },
    { id: "2", typeCode: "model_type", label: "图像生成", value: "image", sortOrder: 2, isActive: true },
    { id: "3", typeCode: "model_type", label: "语音识别", value: "voice", sortOrder: 3, isActive: true },
  ],
  vendor_tier: [
    { id: "1", typeCode: "vendor_tier", label: "T1 头部", value: "T1", sortOrder: 1, isActive: true },
    { id: "2", typeCode: "vendor_tier", label: "T2 主流", value: "T2", sortOrder: 2, isActive: true },
  ],
};

export default function DictsPage() {
  const [dicts, setDicts] = useState(DICT_TYPES);
  const [selectedDict, setSelectedDict] = useState<DictType | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");

  const filteredDicts = dicts.filter((d) => d.name.toLowerCase().includes(searchKeyword.toLowerCase()) || d.code.toLowerCase().includes(searchKeyword.toLowerCase()));

  const columns: TableColumn<DictType>[] = [
    {
      key: "code",
      title: "字典编码",
      width: "150px",
      render: (row) => <code className="text-xs bg-[rgb(var(--admin-bg-secondary))] px-2 py-1 rounded font-medium">{row.code}</code>,
    },
    {
      key: "name",
      title: "字典名称",
      width: "150px",
      render: (row) => <span className="font-medium text-[rgb(var(--admin-text-primary))]">{row.name}</span>,
    },
    { key: "description", title: "描述", width: "200px" },
    {
      key: "itemCount",
      title: "字典项数",
      width: "80px",
      align: "center",
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600">{row.itemCount} 项</span>
      ),
    },
    {
      key: "isActive",
      title: "状态",
      width: "60px",
      align: "center",
      render: (row) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${row.isActive ? "text-green-600 bg-green-50" : "text-gray-600 bg-gray-50"}`}>
          {row.isActive ? "启用" : "禁用"}
        </span>
      ),
    },
    {
      key: "actions",
      title: "操作",
      width: "120px",
      align: "center",
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <AdminButton variant="link" size="sm" onClick={() => setSelectedDict(row)}>
            管理项 <ChevronRight className="h-3 w-3" />
          </AdminButton>
          <AdminButton variant="link" size="sm">编辑</AdminButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BookOpen className="h-6 w-6 text-[rgb(var(--admin-primary))]" />
        <h1 className="text-2xl font-bold text-[rgb(var(--admin-text-primary))]">字典管理</h1>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <AdminCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-[rgb(var(--admin-text-primary))]">{dicts.length}</div>
            <div className="text-xs text-[rgb(var(--admin-text-secondary))]">字典类型</div>
          </div>
        </AdminCard>
        <AdminCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
            <span className="text-lg font-bold">{dicts.reduce((sum, d) => sum + d.itemCount, 0)}</span>
          </div>
          <div>
            <div className="text-sm font-medium text-[rgb(var(--admin-text-primary))]">字典项总数</div>
          </div>
        </AdminCard>
      </div>

      <AdminListPage<DictType>
        title=""
        subtitle="管理系统数据字典，维护各类枚举值和配置项"
        columns={columns}
        data={filteredDicts}
        loading={false}
        searchKeyword={searchKeyword}
        onSearch={setSearchKeyword}
        onCreate={() => {}}
        createButtonText="新建字典"
        emptyText="暂无字典类型"
      />

      {selectedDict && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedDict(null)}>
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[rgb(var(--admin-text-primary))]">{selectedDict?.name} - 字典项管理</h2>
              <button onClick={() => setSelectedDict(null)} className="text-[rgb(var(--admin-text-secondary))] hover:text-[rgb(var(--admin-text-primary))]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {(DICT_ITEMS[selectedDict.code] || []).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-[rgb(var(--admin-bg-secondary))] rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-[rgb(var(--admin-text-tertiary))]">#{item.sortOrder}</span>
                    <span className="font-medium">{item.label}</span>
                    <code className="text-xs bg-white px-2 py-0.5 rounded">{item.value}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <AdminButton variant="link" size="sm">编辑</AdminButton>
                    <AdminButton variant="link" size="sm" className="text-[rgb(var(--admin-danger))]">删除</AdminButton>
                  </div>
                </div>
              ))}
              {(!DICT_ITEMS[selectedDict.code]) && (
                <p className="text-center text-sm text-[rgb(var(--admin-text-secondary))] py-8">暂无字典项</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
