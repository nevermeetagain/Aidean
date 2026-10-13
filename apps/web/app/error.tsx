"use client";

/**
 * error.tsx — route-level error boundary (R-45)。
 *
 * Next.js App Router 自动捕获渲染/数据加载异常，展示品牌包裹的错误页。
 * - reset() 由 Next.js 注入，调用后重试当前 route segment 的渲染；
 * - 不捕获 root layout 级异常（由 global-error.tsx 兜底）。
 */
import Link from "next/link";
import { Button } from "@aidean/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 px-4">
      <div className="flex flex-col items-center gap-2 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/aidean-logo.png" alt="Aidean" width={120} height={33} className="h-8 w-auto" />
        <h2 className="mt-4 text-lg font-semibold text-slate-900">页面出错了</h2>
        <p className="max-w-md text-sm text-slate-500">
          抱歉，此页面加载时遇到问题。您可以尝试重新加载，或返回首页。
        </p>
        {error.digest && (
          <p className="mt-1 font-mono text-xs text-slate-400">错误编号：{error.digest}</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={reset}>
          重试
        </Button>
        <Link href="/">
          <Button variant="primary" size="sm">
            返回首页
          </Button>
        </Link>
      </div>
    </div>
  );
}
