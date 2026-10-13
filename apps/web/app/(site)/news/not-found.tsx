// /news 段专属 404 视图（news-admin-cms D5）：未知 slug / 草稿 / 已删除条目命中 notFound() 时渲染。
// 注：(site)/loading.tsx 的流式骨架屏会把 HTTP 状态码锁定为 200（站内动态路由同构，如 /models/[slug]），
// 本组件保证用户与爬虫看到的是中文「页面不存在」语义而非内置英文兜底页。
import React from "react";
import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NewsNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <FileQuestion size={40} className="text-muted-foreground" />
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">页面不存在</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">该资讯尚未发布，或已被管理员移除。</p>
      <Link
        href="/news"
        className="mt-8 inline-flex items-center rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
      >
        返回资讯列表
      </Link>
    </main>
  );
}
