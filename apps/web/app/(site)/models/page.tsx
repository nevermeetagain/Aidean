// /models —— 模型对比天梯图主页（Task L.4.2 / M-LADDER v1.8 / v1.9 无限滚动）。
// Server 取初始排行首页（读穿缓存/降级直查）与性能轴颗粒度（后台可配），注入 LadderBoard；
// 页面壳（面包屑/H1/介绍）已按 v1.7 交互改版移除，天梯图首屏直达。
// SSR 取数与 store 初始态共用 LADDER_DEFAULT_MODEL_TYPES（类型默认「推理」）
// 与 LADDER_BENCHMARK_COMPOSITE（测评默认「综合」，服务端透传不过滤，仅参与缓存指纹），
// 保证首屏数据与客户端筛选态一致、挂载后不触发重复请求。
// DB 不可用时降级空排行兜底渲染，页面保持可出（build 机无 Docker 不阻断）。
import type { Metadata } from "next";
import { LadderBoard } from "../../../components/ladder/LadderBoard";
import { FeatureDisabled } from "../../../components/common/FeatureDisabled";
import { getFeatureFlags } from "../../../lib/features/flags/service";
import { ladderService } from "../../../lib/features/ladder/service";
import { getLadderGranularity, getLadderHotVendorCount, getLadderLoadWindowPct } from "../../../lib/features/ladder/config";
import {
  LADDER_BENCHMARK_COMPOSITE,
  LADDER_DEFAULT_MODEL_TYPES,
} from "../../../lib/features/ladder/types";
import type { LadderRankingData } from "../../../lib/features/ladder/types";

export const revalidate = 300; // TASK-097：优惠起止无写事件触发，页缓存上限压到 5 分钟（Redis 已按价格边界对齐）

export const metadata: Metadata = {
  title: "模型 · Aidean",
  description: "大模型对比天梯图：旗舰与高性价比模型的实测性能排行可视化。",
};

async function loadInitialRanking(type: "models" | "stations", bandHeight: number): Promise<LadderRankingData> {
  try {
    return (
      await ladderService.getRanking({
        type,
        // R-83 T3 分数带分窗：SSR 首屏只载顶带（综合分前 bandHeight% 量程），滚动触带底客户端续拉
        bandIndex: 0,
        bandHeight,
        filters: {
          modelType: [...LADDER_DEFAULT_MODEL_TYPES],
          benchmark: [LADDER_BENCHMARK_COMPOSITE],
        },
      })
    ).data;
  } catch (error) {
    console.error(`[ladder/${type}] SSR 取数失败，降级空排行：`, error);
    return { type, entries: [], updatedAt: new Date().toISOString() };
  }
}

export default async function ModelsPage() {
  // 受控面首行守卫（TASK-018 / FEATURE_GATES["ladder.model"]）：关闭时呈 feature-disabled 态。
  // 页面级严格 403 受 next@15.0.0 无 forbidden() 限制（见 EVD-018）；受控 API GET /api/v1/ladder?type=models 抛 50011→403。
  const flags = await getFeatureFlags();
  if (!flags["ladder.model"]) return <FeatureDisabled />;

  const [rankingData, granularity, hotVendorCount] = await Promise.all([
    getLadderLoadWindowPct().then((pct) => loadInitialRanking("models", pct)),
    getLadderGranularity(),
    getLadderHotVendorCount(),
  ]);
  return (
    <main className="px-4 pb-6 pt-0 md:px-6">
      {/* v2.6：徽标+标题作为 hero 插槽传入 LadderBoard（服务端渲染节点），与副题/更新时间合并为一体化英雄卡 */}
      <LadderBoard
        pageType="models"
        initialData={rankingData}
        granularity={granularity}
        hotVendorCount={hotVendorCount}
        subtitle="实测综合分排行，卡片越靠上综合分越高；筛选状态见下方工具栏。"
        hero={
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">LADDER / 模型天梯图</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">模型性能天梯图</h1>
          </>
        }
      />
    </main>
  );
}
