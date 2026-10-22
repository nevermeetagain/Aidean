// /news —— 站内资讯：DB 优先（后台 /admin/news 维护），库空/不可用回落静态草稿。
// 分类走 ?cat= 白名单过滤（NEWS_CATEGORIES）；置顶条目恒为列表首位并带「置顶」徽标。
// 页头统一走 PagePlaceholder（与其他一级页面同构）。
// 缓存策略（导航性能修复）：页面本体改为静态 ISR（revalidate=300），使 <Link> 可预取。
// ?cat= 过滤属请求态，原实现直接 await searchParams → force-dynamic → 无法预取 → 生产点击实测 ~379ms。
// 现将全部条目一次性交给服务端取好，把过滤逻辑迁到客户端组件 NewsList（useSearchParams 仅决定前端展示），
// 页面不再触发任何服务端往返。后台保存仍走 revalidatePath("/news")（见 app/api/v1/admin/news/*）。
import React from "react";
import type { Metadata } from "next";

import { PagePlaceholder } from "../../../components/common/PagePlaceholder";
import { NewsList, NewsListView } from "../../../components/news/NewsList";
import { listPublishedNews } from "../../../lib/features/news/repository";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "资讯 · Aidean",
  description: "Aidean 平台动态、功能指引与说明文章。",
};

export default async function NewsPage() {
  const items = await listPublishedNews();

  return (
    <PagePlaceholder
      title="资讯"
      description="平台动态与功能指引：记录 Aidean 的版本更新与使用说明；内容仅涉及本站事实，外部合作与服务承诺以合作页与沟通确认为准。"
    >
      {/* UX-29（CLS）：fallback 直出与「全部」分类同构的完整列表（原为一行「加载资讯列表…」占位，
          水合后整块替换为列表 → 桌面 CLS 0.170 / 移动 0.414）；无 ?cat= 时水合前后 DOM 等高零位移 */}
      <React.Suspense fallback={<NewsListView items={items} />}>
        <NewsList items={items} />
      </React.Suspense>
    </PagePlaceholder>
  );
}
