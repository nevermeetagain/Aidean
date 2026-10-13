"use client";

import { FileQuestion, ArrowLeft, Home, Search } from "lucide-react";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div data-admin className="min-h-screen bg-[rgb(var(--admin-bg))] flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* 图标 */}
        <div className="mb-6 flex justify-center">
          <div className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center">
            <FileQuestion className="h-12 w-12 text-slate-400" />
          </div>
        </div>

        {/* 错误码 */}
        <div className="mb-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-sm font-medium">
            <Search className="h-3.5 w-3.5" />
            404 Not Found
          </span>
        </div>

        {/* 标题 */}
        <h1 className="text-3xl font-bold text-[rgb(var(--admin-text-primary))] mb-3">
          页面不存在
        </h1>

        {/* 描述 */}
        <p className="text-[rgb(var(--admin-text-secondary))] mb-6 leading-relaxed">
          您访问的页面已被删除、移动或暂时不可用。请检查URL是否正确，或返回首页继续操作。
        </p>

        {/* 错误码 */}
        <div className="mb-8 p-3 rounded-lg bg-[rgb(var(--admin-bg-hover))] border border-[rgb(var(--admin-border))]">
          <p className="text-xs text-[rgb(var(--admin-text-muted))] mb-1">错误码</p>
          <p className="text-sm font-mono text-[rgb(var(--admin-text-secondary))]">
            A3AU-404
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgb(var(--admin-primary))] text-white font-medium hover:bg-[rgb(var(--admin-primary-hover))] transition-colors"
          >
            <Home className="h-4 w-4" />
            返回首页
          </Link>

          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[rgb(var(--admin-border))] text-[rgb(var(--admin-text-primary))] font-medium hover:bg-[rgb(var(--admin-bg-hover))] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            返回上一页
          </button>
        </div>

        {/* 版权 */}
        <p className="mt-8 text-xs text-[rgb(var(--admin-text-muted))]">
          © 2026 Aidean Admin. All rights reserved.
        </p>
      </div>
    </div>
  );
}
