import React from "react";
import { PARTNER_CONFIG_KEYS, parsePartnerContent } from "@aidean/shared";
import { prisma } from "../../../lib/db/prisma";
import { PagePlaceholder } from "../../../components/common/PagePlaceholder";
import { SafeImage } from "../../../components/common/SafeImage";

// 缓存策略（2026-09-23 性能改造）：原 force-dynamic 使每次进入都走完整 SSR，
// 且动态路由的 Link 预取只到最近的 loading.tsx 边界——首屏只能先看骨架再等内容。
// 现改为 ISR：与 /models、/ladder 同口径，构建期预渲染 + 运行期复用页面缓存；
// 后台 PUT /api/v1/admin/configs（partners 组）已调 revalidatePath("/partners")，保存即时生效。
export const revalidate = 300;

export default async function PartnersPage() {
  let rows: { configKey: string; configValue: string }[] = [];
  try {
    rows = await prisma.systemConfig.findMany({ where: { configKey: { in: [...PARTNER_CONFIG_KEYS] } }, select: { configKey: true, configValue: true } });
  } catch { /* Safe defaults, not fabricated service claims. */ }
  const items = PARTNER_CONFIG_KEYS.map((key, index) => ({ key, ...parsePartnerContent(rows.find((r) => r.configKey === key)?.configValue, index) })).filter((p) => p.enabled);
  return <PagePlaceholder
    title="合作"
    description="让学习与研究，连接更多可能：了解合作产品的服务介绍与相关资料。服务范围、使用条件及合作方式，请以具体产品说明和沟通确认为准。"
  >
    <div className="space-y-10">
      {items.map((p, index) => <article key={p.key} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-8">
        <div className="grid min-w-0 gap-7 md:grid-cols-2">
          {/* 封面留空回退品牌默认图（SafeImage 内 isSafeMediaUrl 校验 /images/ 路径 + webp 白名单均通过） */}
          <SafeImage src={p.coverUrl || "/images/partners/default-cover.webp"} alt={`${p.title}封面`} />
          <div className="min-w-0 break-words">
            <p className="font-mono text-xs text-primary">0{index + 1} / 合作产品</p>
            <h2 className="mt-3 text-2xl font-semibold text-foreground">{p.title}</h2>
            <p className="mt-2 text-base text-primary">{p.subtitle}</p>
            <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-[var(--muted-foreground)]">{p.description}</p>
            {p.notes && <aside className="mt-5 border-l-2 border-primary/40 pl-4 text-xs leading-6 text-[var(--muted-foreground)]"><strong>补充说明</strong><p className="whitespace-pre-wrap">{p.notes}</p></aside>}
          </div>
        </div>
        {p.images.length > 0 && <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{p.images.map((src, i) => <SafeImage key={`${i}-${src}`} src={src} alt={`${p.title}产品展示 ${i + 1}`} ratio="photo" />)}</div>}
        {p.videoUrl && <figure className="mt-6 max-w-3xl"><figcaption className="mb-2 text-sm text-[var(--muted-foreground)]">{p.title} · 视频介绍</figcaption><video aria-label={`${p.title}视频介绍`} src={p.videoUrl} controls playsInline preload="none" className="aspect-video w-full max-w-3xl rounded-xl bg-black object-contain" style={{ maxHeight: 432 }}>浏览器不支持视频播放。</video></figure>}
      </article>)}
      {items.length === 0 && <p className="rounded-xl border border-[var(--border)] p-8 text-[var(--muted-foreground)]">暂无公开展示的合作产品。</p>}
    </div>
    <p className="mt-10 text-sm text-[var(--muted-foreground)]">合作洽谈与产品咨询：<a className="text-primary underline underline-offset-4" href="mailto:591547726@qq.com">591547726@qq.com</a></p>
  </PagePlaceholder>;
}
