"use client";

// CallPlayground 懒加载包装（2026-10-09 导航性能优化）。
// next/dynamic 的 `ssr: false` 只允许在客户端组件里使用，而 console/page.tsx 是
// Server Component，故把动态导入下沉到本客户端组件：page.tsx 只需静态引用 <CallPlaygroundLazy />，
// 898 行 CallPlayground + echarts 依赖仍在「调用测试台」tab 激活时按需拆包加载。
import nextDynamic from "next/dynamic";

import type { CallPlaygroundProps } from "./CallPlayground";

const CallPlayground = nextDynamic(
  () => import("./CallPlayground").then((mod) => mod.CallPlayground),
  { ssr: false, loading: () => <p className="py-8 text-sm text-slate-400">加载调用测试台…</p> },
);

export function CallPlaygroundLazy(props: CallPlaygroundProps) {
  return <CallPlayground {...props} />;
}
