// /announcements —— 站内公告（S7.4 消费闭环）。
// 数据源：lib/features/announcements/repository（仅展示「已发布+启用+未过期」）。
// force-dynamic：公告发布/停用/过期即时反映，无需后台 revalidatePath 连线（与资讯 ISR 口径不同，取强实时）。
import type { Metadata } from "next";
import Link from "next/link";

import { PagePlaceholder } from "../../../components/common/PagePlaceholder";
import { loadActiveAnnouncements } from "../../../lib/features/announcements/repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "公告 · Aidean",
  description: "Aidean 平台公告：系统通知、维护、更新与推广信息。",
};

const TYPE_LABEL: Record<string, string> = {
  system: "系统",
  maintenance: "维护",
  update: "更新",
  promotion: "推广",
};

export default async function AnnouncementsPage() {
  // UX-03：失败与空显式区分——读库失败渲染错误态 + 重试，绝不显示「当前暂无公告」
  const result = await loadActiveAnnouncements();
  const items = result.ok ? result.items : [];

  return (
    <PagePlaceholder
      title="公告"
      description="平台公告：系统通知、维护安排、功能更新与推广信息。置顶与高优先级公告展示在前。"
    >
      {!result.ok ? (
        <div
          role="alert"
          data-testid="announcements-error"
          className="rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center"
        >
          <p className="text-sm font-medium text-red-700">{result.error}</p>
          {/* 服务端页面：重试即重新请求本页（force-dynamic，不走缓存） */}
          <Link
            href="/announcements"
            prefetch={false}
            data-testid="announcements-retry"
            className="mt-4 inline-block rounded-lg border border-red-200 bg-white px-4 py-2 text-sm text-red-700 transition-colors hover:bg-red-50"
          >
            重试
          </Link>
        </div>
      ) : items.length === 0 ? (
        <p data-testid="announcements-empty" className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          当前暂无公告。
        </p>
      ) : (
        <ul className="space-y-4">
          {items.map((a) => (
            <li key={a.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center gap-2">
                {a.isPinned ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">置顶</span>
                ) : null}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {TYPE_LABEL[a.type] ?? a.type}
                </span>
                <h2 className="text-base font-semibold text-slate-900">{a.title}</h2>
                <span className="ml-auto text-xs text-slate-400">{a.date}</span>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{a.content}</p>
            </li>
          ))}
        </ul>
      )}
    </PagePlaceholder>
  );
}
