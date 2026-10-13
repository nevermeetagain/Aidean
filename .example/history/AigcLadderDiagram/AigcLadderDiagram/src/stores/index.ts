/**
 * Zustand Stores 统一导出
 * 全局状态管理中心
 */

// 用户状态
export { useUserStore, type UserState, type UserProfile } from "./userStore";

// UI状态
export { useUIStore, type UIState, type ThemeMode, type ViewMode } from "./uiStore";

// 天梯图状态
export {
  useLadderStore,
  type LadderState,
  type LadderFilter,
  type LadderSort,
  type CompareModel,
} from "./ladderStore";

// 模型详情状态
export { useModelStore, type ModelState, type ModelDetail } from "./modelStore";

// 资源中心状态
export { useResourceStore, type ResourceState, type ResourceFilter } from "./resourceStore";

// 测评车状态
export { useCartStore, type CartState, type CartItem } from "./cartStore";

// 通知状态
export { useNotificationStore, type NotificationState, type Notification } from "./notificationStore";
