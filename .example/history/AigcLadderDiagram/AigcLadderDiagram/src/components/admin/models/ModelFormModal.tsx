"use client";

import { useState, useEffect } from "react";
import { AdminModal } from "@/components/admin/shared/AdminModal";
import { AdminButton } from "@/components/admin/shared/AdminButton";
import { Input } from "@/components/ui/input";
import { useList } from "@/hooks/useApi";
import { apiKeys } from "@/hooks/useApi";

export interface ModelFormData {
  id?: string;
  modelCode: string;
  nameDisplay: string;
  nameCn: string;
  modelType: string;
  vendorId: string;
  status: string;
  isOpenSource: boolean;
  description?: string;
  contextWindow?: number;
  maxTokens?: number;
  inputPrice?: number;
  outputPrice?: number;
}

interface VendorOption {
  id: string;
  name: string;
  code: string;
}

interface ModelFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ModelFormData) => void;
  initialData?: Partial<ModelFormData>;
  isLoading?: boolean;
}

const MODEL_TYPES = [
  { value: "CHAT", label: "对话" },
  { value: "REASONING", label: "推理" },
  { value: "MULTIMODAL", label: "多模态" },
  { value: "CODE", label: "代码" },
  { value: "VISION", label: "视觉" },
  { value: "AUDIO", label: "语音" },
  { value: "EMBEDDING", label: "嵌入" },
  { value: "RERANK", label: "排序" },
  { value: "ASR", label: "语音识别" },
  { value: "TTS", label: "语音合成" },
];

const MODEL_STATUSES = [
  { value: "ACTIVE", label: "活跃" },
  { value: "INACTIVE", label: "停用" },
  { value: "DEPRECATED", label: "废弃" },
  { value: "BETA", label: "测试" },
];

export function ModelFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading,
}: ModelFormModalProps) {
  const { items: vendors } = useList<VendorOption>(apiKeys.vendors({}), {
    params: { page: 1, limit: 100 },
  });

  const [formData, setFormData] = useState<ModelFormData>({
    modelCode: "",
    nameDisplay: "",
    nameCn: "",
    modelType: "CHAT",
    vendorId: "",
    status: "ACTIVE",
    isOpenSource: false,
    description: "",
    contextWindow: undefined,
    maxTokens: undefined,
    inputPrice: undefined,
    outputPrice: undefined,
  });

  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({ ...prev, ...initialData }));
    } else {
      setFormData({
        modelCode: "",
        nameDisplay: "",
        nameCn: "",
        modelType: "CHAT",
        vendorId: "",
        status: "ACTIVE",
        isOpenSource: false,
        description: "",
        contextWindow: undefined,
        maxTokens: undefined,
        inputPrice: undefined,
        outputPrice: undefined,
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isEditing = !!initialData?.id;

  const labelClass = "block text-sm font-medium text-[rgb(var(--admin-text-primary))] mb-1.5";
  const selectClass = "w-full px-3 py-2 rounded-md border border-[rgb(var(--admin-border))] bg-[rgb(var(--admin-bg-sidebar))] text-[rgb(var(--admin-text-primary))] text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--admin-primary))]";

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "编辑模型" : "新建模型"}
      description={isEditing ? "修改模型配置信息" : "添加新的AI模型到系统"}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <AdminButton variant="secondary" onClick={onClose}>
            取消
          </AdminButton>
          <AdminButton onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "保存中..." : isEditing ? "保存修改" : "创建模型"}
          </AdminButton>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 基本信息 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              模型代码 <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.modelCode}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, modelCode: e.target.value }))
              }
              placeholder="例如: gpt-4o"
              required
            />
          </div>
          <div>
            <label className={labelClass}>
              显示名称 <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.nameDisplay}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, nameDisplay: e.target.value }))
              }
              placeholder="例如: GPT-4o"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>中文名称</label>
            <Input
              value={formData.nameCn}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, nameCn: e.target.value }))
              }
              placeholder="例如: GPT-4o多模态模型"
            />
          </div>
          <div>
            <label className={labelClass}>所属厂商</label>
            <select
              value={formData.vendorId}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, vendorId: e.target.value }))
              }
              className={selectClass}
            >
              <option value="">选择厂商</option>
              {vendors?.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>模型类型</label>
            <select
              value={formData.modelType}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, modelType: e.target.value }))
              }
              className={selectClass}
            >
              {MODEL_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>状态</label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, status: e.target.value }))
              }
              className={selectClass}
            >
              {MODEL_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isOpenSource"
            checked={formData.isOpenSource}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, isOpenSource: e.target.checked }))
            }
            className="h-4 w-4 rounded border-[rgb(var(--admin-border))] text-[rgb(var(--admin-primary))] focus:ring-[rgb(var(--admin-primary))]"
          />
          <label htmlFor="isOpenSource" className="text-sm text-[rgb(var(--admin-text-secondary))] cursor-pointer">
            开源模型
          </label>
        </div>

        <div>
          <label className={labelClass}>模型描述</label>
          <Input
            value={formData.description || ""}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="模型的简要描述..."
          />
        </div>

        {/* 能力参数 */}
        <div className="border-t border-[rgb(var(--admin-border))] pt-4">
          <h4 className="text-sm font-medium text-[rgb(var(--admin-text-primary))] mb-3">
            能力参数
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>上下文窗口</label>
              <Input
                type="number"
                value={formData.contextWindow || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    contextWindow: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                placeholder="例如: 128000"
              />
            </div>
            <div>
              <label className={labelClass}>最大Token数</label>
              <Input
                type="number"
                value={formData.maxTokens || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    maxTokens: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                placeholder="例如: 4096"
              />
            </div>
          </div>
        </div>

        {/* 价格配置 */}
        <div className="border-t border-[rgb(var(--admin-border))] pt-4">
          <h4 className="text-sm font-medium text-[rgb(var(--admin-text-primary))] mb-3">
            价格配置（每1M tokens）
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>输入价格（元）</label>
              <Input
                type="number"
                step="0.01"
                value={formData.inputPrice || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    inputPrice: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                placeholder="例如: 5.0"
              />
            </div>
            <div>
              <label className={labelClass}>输出价格（元）</label>
              <Input
                type="number"
                step="0.01"
                value={formData.outputPrice || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    outputPrice: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                placeholder="例如: 15.0"
              />
            </div>
          </div>
        </div>
      </form>
    </AdminModal>
  );
}
