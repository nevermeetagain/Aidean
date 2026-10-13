import Link from "next/link";

/**
 * 首页公告横幅（S7.4 消费闭环）：纯展示服务端组件。
 * 仅当存在有效公告时由首页渲染（无公告不产生此节点）；点击跳 /announcements 查看全量。
 */
export default function AnnouncementBanner({ title, href }: { title: string; href: string }) {
  return (
    <div className="border-b border-amber-200/70 bg-amber-50/80">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 md:px-6">
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">公告</span>
        <Link href={href} className="min-w-0 flex-1 truncate text-sm text-amber-900 transition-colors hover:text-amber-700">
          {title}
        </Link>
        <Link href={href} className="shrink-0 text-xs font-medium text-amber-700 hover:text-amber-900">
          查看全部 →
        </Link>
      </div>
    </div>
  );
}
