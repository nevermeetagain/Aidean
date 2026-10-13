// Admin 共享组件统一导出

export { AdminButton, type ButtonVariant, type ButtonSize } from "./AdminButton";
export { AdminTable, type TableColumn, type TablePagination } from "./AdminTable";
export { AdminCard, AdminStatCard } from "./AdminCard";
export { AdminModal, ConfirmModal } from "./AdminModal";
export {
  ToastProvider,
  useToast,
  useToastActions,
  type ToastType,
  type Toast,
} from "./AdminToast";
export { StatusBadge, BoolBadge } from "./StatusBadge";
export { SearchBar } from "./SearchBar";
export { ConfirmDialog, DeleteConfirm } from "./ConfirmDialog";
export { AdminErrorBoundary } from "./AdminErrorBoundary";
