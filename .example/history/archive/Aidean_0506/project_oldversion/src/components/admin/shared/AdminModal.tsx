"use client";

import { ReactNode, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { AdminButton } from "./AdminButton";

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
}

export function AdminModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeOnOverlayClick = true,
  showCloseButton = true,
}: AdminModalProps) {
  // ESC键关闭
  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, handleEsc]);

  const sizeStyles = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />

      {/* 对话框 */}
      <div
        className={`
          relative w-full ${sizeStyles[size]} mx-4
          bg-[rgb(var(--admin-bg-sidebar))]
          rounded-xl
          shadow-2xl
          border border-[rgb(var(--admin-border))]
          transform transition-all
          animate-in fade-in zoom-in-95 duration-200
        `}
      >
        {/* 头部 */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-[rgb(var(--admin-border-light))]">
          <div>
            <h3 className="text-lg font-semibold text-[rgb(var(--admin-text-primary))]">
              {title}
            </h3>
            {description && (
              <p className="mt-1 text-sm text-[rgb(var(--admin-text-muted))]">
                {description}
              </p>
            )}
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[rgb(var(--admin-text-muted))] hover:bg-[rgb(var(--admin-bg-hover))] hover:text-[rgb(var(--admin-text-primary))] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* 内容 */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          {children}
        </div>

        {/* 底部 */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[rgb(var(--admin-border-light))] bg-[rgb(var(--admin-bg))] rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// 确认对话框快捷组件
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "primary" | "danger";
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "确认",
  cancelText = "取消",
  confirmVariant = "primary",
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose}>
            {cancelText}
          </AdminButton>
          <AdminButton
            variant={confirmVariant}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </AdminButton>
        </>
      }
    >
      <div className="text-sm text-[rgb(var(--admin-text-secondary))]">
        此操作无法撤销，请确认是否继续？
      </div>
    </AdminModal>
  );
}
