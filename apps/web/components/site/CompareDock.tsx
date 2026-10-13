"use client";


/**
 * CompareDock：对比测评右下角悬浮暂存篮（EVAL-01）。
 * - 由 (site)/layout.tsx 挂载；仅 ≥640px 显示（`sm:flex`），计数/清空/直达 /evaluations/new；
 * - 客户端 hydration 后回填 localStorage（防首屏闪烁：挂载前 items 恒空）；
 * - 浅色体系（slate/white + text-primary），无 dark:，无 opacity-0 首屏（条件渲染而非透明占位）。
 */
import { useEffect } from "react";
import Link from "next/link";
import { useCompareStore, hydrateCompareFromStorage } from "../../stores/compareStore";
import { Button } from "@aidean/ui";

export function CompareDock() {
  const items = useCompareStore((s) => s.items);
  const clear = useCompareStore((s) => s.clear);
  const remove = useCompareStore((s) => s.remove);

  useEffect(() => {
    hydrateCompareFromStorage();
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 hidden w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl sm:block">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">
          对比篮（{items.length}/6）
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clear}
          className="text-xs text-slate-400 hover:text-primary"
        >
          清空
        </Button>
      </div>
      <ul className="mb-3 max-h-40 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <li key={item.modelId} className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1">
            <Link
              href={item.slug ? `/models/${item.slug}` : `/models/${item.modelId}`}
              className="truncate text-sm text-slate-600 hover:text-primary"
            >
              {item.nameDisplay}
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`移除 ${item.nameDisplay}`}
              onClick={() => remove(item.modelId)}
              className="ml-2 text-xs text-slate-300 hover:text-red-500"
            >
              ✕
            </Button>
          </li>
        ))}
      </ul>
      <Link
        href="/evaluations/new"
        className="block rounded-lg bg-primary px-3 py-2 text-center text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        开始对比测评（{items.length} 个模型）
      </Link>
    </div>
  );
}
