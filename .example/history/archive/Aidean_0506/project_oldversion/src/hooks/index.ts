// ==================== Hooks 统一导出 ====================

// 权限
export { usePermission, useHasPermission, useIsAdmin } from "./usePermission";
export type { UserRole, Permission } from "./usePermission";

// API 数据获取
export {
  useApi,
  useList,
  useEntity,
  useMutation,
  useCreate,
  useUpdate,
  useDelete,
  apiKeys,
} from "./useApi";
export type { UseListOptions, UseEntityOptions, ApiError } from "./useApi";

// 加载状态
export {
  useLoading,
  useMultiLoading,
  useDebounceLoading,
  usePageLoading,
  TableSkeleton,
  CardSkeleton,
  PageSkeleton,
} from "./useLoading";
export type { UseLoadingReturn, UseMultiLoadingReturn, UsePageLoadingReturn } from "./useLoading";

// 乐观更新
export {
  useOptimistic,
  useOptimisticList,
  useOptimisticForm,
  useOperationQueue,
} from "./useOptimistic";
export type { UseOptimisticOptions, UseOptimisticListOptions } from "./useOptimistic";
