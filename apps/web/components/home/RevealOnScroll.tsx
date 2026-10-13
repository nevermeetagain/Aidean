// 进场渐显包装器（M-PERF A3 重写）：纯 CSS keyframes，零 JS 状态。
// 相比旧实现（useState + IntersectionObserver）的三点收益：
//   1. SSR 输出即为可见态（不再输出 opacity-0 初始类）——首屏内容不等待 hydration；
//   2. 修复「threshold 0.15 + 超高 section ⇒ 永久不可见」的边界缺陷（无 IO 依赖）；
//   3. 客户端零 JS（无 hooks，server/client 双语境可用）。
// 口径变化：入场动画在挂载时即播放（duration 200ms），滚动触发渐入语义移除，
// 需求侧「滚动渐入」由各页面上屏即播替代——已同步 UI 设计文档（见 C3）。
// prefers-reduced-motion 由 globals.css 媒体查询处理。
import type { ReactNode } from "react";

interface RevealOnScrollProps {
  children: ReactNode;
  className?: string;
}

export function RevealOnScroll({ children, className }: RevealOnScrollProps) {
  return <div className={`reveal-in${className ? ` ${className}` : ""}`}>{children}</div>;
}
