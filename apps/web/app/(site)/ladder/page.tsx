// /ladder —— 大模型云服务天梯图（Task L.4.2 新建目录 / v1.9 无限滚动）。
// H1「大模型云服务平台」，副标题保留「大模型云服务天梯图」；
// Server 直取 stations 排行首页与性能轴颗粒度注入 LadderBoard，附说明 Banner 与两张静态设置卡。
import type { Metadata } from "next";
import Link from "next/link";
import { Cloud, Info, Settings2 } from "lucide-react";
import { LadderBoard } from "../../../components/ladder/LadderBoard";
import { ladderService } from "../../../lib/features/ladder/service";
import { getLadderGranularity, getLadderHotVendorCount, getLadderLoadWindowPct, getLadderTierThresholds } from "../../../lib/features/ladder/config";
import type { TierThresholds } from "../../../lib/features/ladder/config";
import type { LadderRankingData } from "../../../lib/features/ladder/types";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "大模型云服务平台 · Aidean",
  description: "大模型云服务天梯图：主流云厂商 API 平台的价格、稳定性与响应观测矩阵。",
};

async function loadStationsRanking(bandHeight: number): Promise<LadderRankingData> {
  try {
    // R-83 T3 分数带分窗：SSR 首屏只载顶带，滚动触带底客户端续拉
    return (await ladderService.getRanking({ type: "stations", bandIndex: 0, bandHeight })).data;
  } catch (error) {
    console.error("[ladder/stations] SSR 取数失败，降级空排行：", error);
    return { type: "stations", entries: [], updatedAt: new Date().toISOString() };
  }
}

const CARD_CLS =
  "rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm";

function NoteCard({ title, icon: Icon, children }: {
  title: string;
  icon: typeof Info;
  children: React.ReactNode;
}) {
  return (
    <details className={CARD_CLS}>
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-700 [&::-webkit-details-marker]:hidden">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        {title}
      </summary>
      <div className="mt-3 text-xs leading-relaxed text-slate-500">{children}</div>
    </details>
  );
}

export default async function LadderPage() {
  const [rankingData, granularity, tierThresholds, hotVendorCount] = await Promise.all([
    getLadderLoadWindowPct().then((pct) => loadStationsRanking(pct)),
    getLadderGranularity(),
    getLadderTierThresholds(),
    getLadderHotVendorCount(),
  ]);
  return (
    <main className="px-4 pb-14 pt-0 md:px-6">
      <nav aria-label="面包屑" className="mb-8 text-sm text-slate-500">
        <Link href="/" className="transition-colors hover:text-primary">
          首页
        </Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">大模型云服务平台</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-6">
        <header className="max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">大模型云服务平台</h1>
          <p className="mt-1 text-sm font-medium text-primary md:text-base">大模型云服务天梯图</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-500 md:text-base">
            聚合主流大模型云厂商 API 平台的综合评分档位矩阵：按 5 分一档横向对比各平台的
            价格、稳定性、响应速度与在线率，支持筛选、排序与表格/柱状图双视图切换。
          </p>
        </header>

        {/* 一卡 Banner + 右侧并列两张静态说明卡（details 展开） */}
        <aside className="flex w-full flex-col gap-3 lg:w-[340px]">
          <div className={`${CARD_CLS} bg-gradient-to-r from-[var(--muted)] to-transparent`}>
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Cloud className="h-4 w-4 text-primary" aria-hidden="true" />
              云服务榜观察口径
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              行为综合评分档位（每 5 分一档），列为 API 平台；单元格展示该平台当前档位内最高分模型。
              悬停高亮行列，点击单元格进入模型详情。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NoteCard title="表格设置" icon={Settings2}>
              <ul className="list-disc space-y-1 pl-4">
                <li>首列分数档底色随档位加深</li>
                <li>列头圆点为厂商品牌色</li>
                <li>悬停行/列联动高亮</li>
                <li>点单元格跳转模型详情</li>
              </ul>
            </NoteCard>
            <NoteCard title="数据说明" icon={Info}>
              <ul className="list-disc space-y-1 pl-4">
                <li>评分=四维加权综合（权重 30/30/20/20）</li>
                <li>榜单缓存约 1 小时刷新</li>
                <li>更新时间以工具栏标注为准</li>
              </ul>
            </NoteCard>
          </div>
        </aside>
      </div>

      <section className="mt-10">
        <LadderBoard pageType="stations" initialData={rankingData} granularity={granularity} tierThresholds={tierThresholds} hotVendorCount={hotVendorCount} />
      </section>
    </main>
  );
}
