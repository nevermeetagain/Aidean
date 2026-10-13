import { NewsManager } from "../../../../components/admin/NewsManager";

export const dynamic = "force-dynamic";

export default function AdminNewsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">资讯管理</h1>
        <p className="mt-1 text-xs text-slate-500">
          资讯以 Markdown 原文存储，编辑回读即 Markdown；保存/置顶/发布即时同步前台 /news 与 /news/[slug]。
        </p>
      </div>
      <NewsManager />
    </div>
  );
}
