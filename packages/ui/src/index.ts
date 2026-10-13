// @aidean/ui - 组件底座(shadcn 风格占位简化版;零业务逻辑)
//
// 导航性能优化（2026-09-28）：
// EChartWrapper（依赖 echarts/zrender ~900KB）从 barrel 主入口移除，
// 改为独立子路径 @aidean/ui/charts 导出。此前所有 import { Button } from "@aidean/ui"
// 的页面都会在编译期拉入 echarts 全量模块树，拖慢首次编译 600ms-2.4s。
// 现在只有显式 import { EChartWrapper } from "@aidean/ui/charts" 才会引入 echarts。
// 配合 next.config.mjs optimizePackageImports: ["@aidean/ui"]，按 import 路径做 per-module tree-shaking。
export { cn, type ClassValue } from "./lib/cn";

export { Button, type ButtonProps } from "./components/ui/button";
export { Input, type InputProps } from "./components/ui/input";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./components/ui/card";
export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./components/ui/table";
export { Tabs, type TabsProps, type TabItem } from "./components/ui/tabs";
export { Badge, type BadgeProps } from "./components/ui/badge";
export { Dialog, type DialogProps } from "./components/ui/dialog";
export {
  DropdownMenu,
  type DropdownMenuProps,
  type DropdownItem,
} from "./components/ui/dropdown-menu";

// EChartWrapper 已移至 ./charts 子路径——见 @aidean/ui/charts 导出。
// 如需使用图表：import { EChartWrapper } from "@aidean/ui/charts"
