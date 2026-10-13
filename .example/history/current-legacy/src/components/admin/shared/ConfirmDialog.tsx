"use client";

import { AlertTriangle } from "lucide-react";
import { AdminButton } from "./AdminButton";
import { AdminModal } from "./AdminModal";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "确认",
  cancelText = "取消",
  danger = false,
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </AdminButton>
          <AdminButton
            variant={danger ? "danger" : "primary"}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </AdminButton>
        </>
      }
    >
      {danger && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">
            此操作不可撤销，删除后数据将无法恢复。
          </p>
        </div>
      )}
    </AdminModal>
  );
}

// 删除确认快捷组件
interface DeleteConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName?: string;
  isLoading?: boolean;
}

export function DeleteConfirm({
  isOpen,
  onClose,
  onConfirm,
  itemName = "该数据",
  isLoading = false,
}: DeleteConfirmProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="确认删除"
      description={`确定要删除 ${itemName} 吗？`}
      confirmText="删除"
      danger
      isLoading={isLoading}
    />
  );
}
