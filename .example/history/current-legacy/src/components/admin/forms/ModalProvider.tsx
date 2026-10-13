"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useId,
} from "react";
import { AdminModal } from "@/components/admin/shared/AdminModal";
import { FormBuilder, FormField } from "./FormBuilder";
import { AdminButton } from "@/components/admin/shared/AdminButton";

// ==================== 类型定义 ====================

interface ModalConfig {
  id: string;
  type: "form" | "confirm" | "custom";
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl";
  isOpen: boolean;
  isLoading?: boolean;
  // Form 配置
  fields?: FormField[];
  initialData?: Record<string, unknown>;
  onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
  submitText?: string;
  // Confirm 配置
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "primary" | "danger";
  onConfirm?: () => void | Promise<void>;
  // Custom 配置
  content?: ReactNode;
  footer?: ReactNode;
  // 通用
  onClose?: () => void;
}

interface ModalContextValue {
  // 表单弹窗
  openFormModal: (config: Omit<ModalConfig, "id" | "type" | "isOpen">) => string;
  // 确认弹窗
  openConfirmModal: (config: {
    title: string;
    description?: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: "primary" | "danger";
    size?: "sm" | "md" | "lg" | "xl";
  }) => string;
  // 自定义弹窗
  openCustomModal: (config: {
    title: string;
    description?: string;
    content: ReactNode;
    footer?: ReactNode;
    size?: "sm" | "md" | "lg" | "xl";
    onClose?: () => void;
  }) => string;
  // 关闭弹窗
  closeModal: (id: string) => void;
  closeAllModals: () => void;
  // 更新弹窗状态
  setModalLoading: (id: string, isLoading: boolean) => void;
}

// ==================== Context ====================

const ModalContext = createContext<ModalContextValue | null>(null);

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within ModalProvider");
  }
  return context;
}

// ==================== Provider ====================

interface ModalProviderProps {
  children: ReactNode;
}

export function ModalProvider({ children }: ModalProviderProps) {
  const [modals, setModals] = useState<ModalConfig[]>([]);
  const baseId = useId();

  const generateId = useCallback(() => {
    return `${baseId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, [baseId]);

  const openFormModal = useCallback(
    (config: Omit<ModalConfig, "id" | "type" | "isOpen">): string => {
      const id = generateId();
      setModals((prev) => [
        ...prev,
        {
          ...config,
          id,
          type: "form",
          isOpen: true,
          size: config.size || "lg",
        },
      ]);
      return id;
    },
    [generateId]
  );

  const openConfirmModal = useCallback(
    (config: {
      title: string;
      description?: string;
      onConfirm: () => void | Promise<void>;
      confirmText?: string;
      cancelText?: string;
      confirmVariant?: "primary" | "danger";
      size?: "sm" | "md" | "lg" | "xl";
    }): string => {
      const id = generateId();
      setModals((prev) => [
        ...prev,
        {
          id,
          type: "confirm",
          isOpen: true,
          size: config.size || "sm",
          title: config.title,
          description: config.description,
          confirmText: config.confirmText || "确认",
          cancelText: config.cancelText || "取消",
          confirmVariant: config.confirmVariant || "primary",
          onConfirm: config.onConfirm,
        },
      ]);
      return id;
    },
    [generateId]
  );

  const openCustomModal = useCallback(
    (config: {
      title: string;
      description?: string;
      content: ReactNode;
      footer?: ReactNode;
      size?: "sm" | "md" | "lg" | "xl";
      onClose?: () => void;
    }): string => {
      const id = generateId();
      setModals((prev) => [
        ...prev,
        {
          id,
          type: "custom",
          isOpen: true,
          size: config.size || "md",
          title: config.title,
          description: config.description,
          content: config.content,
          footer: config.footer,
          onClose: config.onClose,
        },
      ]);
      return id;
    },
    [generateId]
  );

  const closeModal = useCallback((id: string) => {
    setModals((prev) => {
      const modal = prev.find((m) => m.id === id);
      if (modal?.onClose) {
        modal.onClose();
      }
      return prev.filter((m) => m.id !== id);
    });
  }, []);

  const closeAllModals = useCallback(() => {
    setModals((prev) => {
      prev.forEach((modal) => {
        if (modal.onClose) {
          modal.onClose();
        }
      });
      return [];
    });
  }, []);

  const setModalLoading = useCallback((id: string, isLoading: boolean) => {
    setModals((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isLoading } : m))
    );
  }, []);

  const handleModalClose = useCallback(
    (id: string) => {
      setModals((prev) =>
        prev.map((m) => (m.id === id ? { ...m, isOpen: false } : m))
      );
      // 延迟移除，给动画时间
      setTimeout(() => {
        closeModal(id);
      }, 200);
    },
    [closeModal]
  );

  const contextValue: ModalContextValue = {
    openFormModal,
    openConfirmModal,
    openCustomModal,
    closeModal,
    closeAllModals,
    setModalLoading,
  };

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
      {/* 渲染所有弹窗 */}
      {modals.map((modal) => {
        if (modal.type === "form") {
          return (
            <AdminModal
              key={modal.id}
              isOpen={modal.isOpen}
              onClose={() => handleModalClose(modal.id)}
              title={modal.title}
              description={modal.description}
              size={modal.size}
              footer={null}
            >
              {modal.fields && (
                <FormBuilder
                  fields={modal.fields}
                  initialData={modal.initialData}
                  onSubmit={async (data) => {
                    if (modal.onSubmit) {
                      setModalLoading(modal.id, true);
                      try {
                        await modal.onSubmit(data);
                        handleModalClose(modal.id);
                      } finally {
                        setModalLoading(modal.id, false);
                      }
                    }
                  }}
                  onCancel={() => handleModalClose(modal.id)}
                  isLoading={modal.isLoading}
                  submitText={modal.submitText}
                />
              )}
            </AdminModal>
          );
        }

        if (modal.type === "confirm") {
          return (
            <AdminModal
              key={modal.id}
              isOpen={modal.isOpen}
              onClose={() => handleModalClose(modal.id)}
              title={modal.title}
              description={modal.description}
              size={modal.size}
              footer={
                <div className="flex justify-end gap-2">
                  <AdminButton
                    variant="ghost"
                    onClick={() => handleModalClose(modal.id)}
                  >
                    {modal.cancelText}
                  </AdminButton>
                  <AdminButton
                    variant={modal.confirmVariant}
                    onClick={async () => {
                      if (modal.onConfirm) {
                        setModalLoading(modal.id, true);
                        try {
                          await modal.onConfirm();
                          handleModalClose(modal.id);
                        } finally {
                          setModalLoading(modal.id, false);
                        }
                      }
                    }}
                    isLoading={modal.isLoading}
                  >
                    {modal.confirmText}
                  </AdminButton>
                </div>
              }
            >
              <div className="text-sm text-[rgb(var(--admin-text-secondary))]">
                此操作无法撤销，请确认是否继续？
              </div>
            </AdminModal>
          );
        }

        if (modal.type === "custom") {
          return (
            <AdminModal
              key={modal.id}
              isOpen={modal.isOpen}
              onClose={() => handleModalClose(modal.id)}
              title={modal.title}
              description={modal.description}
              size={modal.size}
              footer={modal.footer}
            >
              {modal.content}
            </AdminModal>
          );
        }

        return null;
      })}
    </ModalContext.Provider>
  );
}

// ==================== 快捷 Hook ====================

export function useConfirm() {
  const { openConfirmModal, closeModal } = useModal();

  return useCallback(
    (
      title: string,
      onConfirm: () => void | Promise<void>,
      options?: {
        description?: string;
        confirmText?: string;
        confirmVariant?: "primary" | "danger";
      }
    ) => {
      return openConfirmModal({
        title,
        description: options?.description,
        onConfirm,
        confirmText: options?.confirmText || "确认",
        cancelText: "取消",
        confirmVariant: options?.confirmVariant || "primary",
        size: "sm",
      });
    },
    [openConfirmModal]
  );
}

export function useFormModal() {
  const { openFormModal, closeModal, setModalLoading } = useModal();

  return useCallback(
    (
      title: string,
      fields: FormField[],
      onSubmit: (data: Record<string, unknown>) => void | Promise<void>,
      options?: {
        description?: string;
        initialData?: Record<string, unknown>;
        submitText?: string;
        size?: "sm" | "md" | "lg" | "xl";
      }
    ) => {
      return openFormModal({
        title,
        description: options?.description,
        fields,
        initialData: options?.initialData,
        onSubmit,
        submitText: options?.submitText || "提交",
        size: options?.size || "lg",
      });
    },
    [openFormModal]
  );
}
