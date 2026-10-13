// /user/console —— 用户控制台真实版（Task A.4.2 / WP-FE01 调用链路接线）。
// 数据源：requireUser（RSC 守卫）+ userService 四路并行取数。
// WF-19（P6/P2）：三张 CoreInfoCard（compact）右置于页头标题区竖排，保留
// FlowGradient 特效、三卡精确文案与 balance-entry 钩子（e2e 红线）。
// WP-FE01 起追加「调用测试台」（CallPlayground），
// 打通 模型选择（档位/优先级/free）→ 网关调用（非流+流式）→ 延迟与花费可解释。
//
// 导航性能优化（2026-10-09）：
// CallPlayground（898 行客户端组件）改 next/dynamic 懒加载——首屏不打入主 bundle，
// 仅在用户切到「调用测试台」tab 时按需加载，减少首屏 JS payload 与 hydration 成本。
import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, BadgeCheck, Gift, Wallet } from "lucide-react";

import {
  groupQuotasByCycle,
  userService,
  type PriorityItem,
  type QuotaUsageView,
  type TierMappingsView,
} from "../../../../lib/features/user/service";
import { requireUser, type SessionContext } from "../../../../lib/features/auth/session";
import { GeneralForm } from "../../../../components/console/GeneralForm";
import { ConsoleWorkspace } from "../../../../components/console/ConsoleWorkspace";
import { ProPrioritiesList } from "../../../../components/console/ProPrioritiesList";
import { CoreInfoCard } from "../../../../components/console/CoreInfoCard";
import { PageHero } from "../../../../components/common/PageHero";
import { ApiKeysPanel } from "../../../../components/console/ApiKeysPanel";
import { ApiChannelsPanel } from "../../../../components/console/ApiChannelsPanel";
import { UsageStatsPanel } from "../../../../components/console/UsageStatsPanel";
import { UsageRecentList } from "../../../../components/console/UsageRecentList";
import { CallPlaygroundLazy } from "../../../../components/console/CallPlaygroundLazy";

export const dynamic = "force-dynamic"; // 与中间件守卫语义一致：始终请求态渲染

type Profile = Awaited<ReturnType<typeof userService.getProfile>>;

/**
 * 单路取数降级包裹：任一查询失败（[待 DB] 环境无库 / e2e 注入会话无对应用户行）时，
 * 该卡片区域以空态兜底渲染而非整页 500——页面其余部分保持可用。
 */
async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

const PROFILE_FALLBACK: Profile = {
  id: "",
  email: "",
  nickname: null,
  tier: "NORMAL",
  tierLabel: "普通用户",
  balanceYuan: "0.00",
};

const TIERS_FALLBACK: TierMappingsView = {
  tiers: { OPUS: [], SONNET: [], FABLE: [], HAIKU: [] },
  free: { freeNote: "" },
};

/** nextResetAt（ISO）→ MM-DD 展示；非法时间降级占位符 */
function formatMMDD(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--";
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 免费额度三段固定顺序（周期 → 中文标题） */
const CYCLE_SECTIONS: ReadonlyArray<{ cycle: "DAY" | "WEEK" | "MONTH"; label: string }> = [
  { cycle: "DAY", label: "天刷新" },
  { cycle: "WEEK", label: "周刷新" },
  { cycle: "MONTH", label: "月刷新" },
];

export default async function ConsolePage() {
  // 中间件已守卫 /user/*，此处兜底未由中间件放行的直接访问；
  // requireUser 内部 redirect 的 NEXT_REDIRECT 一并归一至 /login。
  let user: SessionContext;
  try {
    user = await requireUser("/user/console");
  } catch {
    redirect("/login");
  }

  const [profile, quotas, priorities, tierMappings] = await Promise.all([
    safe(userService.getProfile(user.userId), PROFILE_FALLBACK),
    safe(userService.quotaUsage(user.userId), [] as QuotaUsageView[]),
    safe(userService.listPriorities(user.userId), [] as PriorityItem[]),
    safe(userService.listTierMappings(user.userId), TIERS_FALLBACK),
  ]);

  // 今日用量合计（totalQuotaTokens 为该等级全量免费额度上限）
  const totalQuota = quotas.reduce((sum, item) => sum + item.totalQuotaTokens, 0);
  const usedToday = quotas.reduce((sum, item) => sum + item.usedTokens, 0);
  const usedPct = totalQuota > 0 ? Math.round((usedToday / totalQuota) * 100) : 0;

  // usedTokens 实况：userService.quotaUsage 直读 user_quota_usages 当期行
  // （与 gateway FREE_QUOTA 记账同 periodStart 本地零点口径），非占位值。
  const groupedQuotas = groupQuotasByCycle(quotas);

  // 调用测试台候选：free 池模型（含刷新周期），与档位/优先级共同构成模型选择三源
  const freeQuotas = quotas.map((item: QuotaUsageView) => ({
    modelId: item.modelId,
    modelName: item.modelName,
    resetCycle: item.resetCycle,
  }));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-14 pt-0 md:px-6">
      {/* 产品化页头（M4 风格对齐）：改用共享 PageHero（令牌化、暗色安全），
          与 /user/balance 及 news/pricing 基准同构；stats/redeem 作 children 保留全部 e2e 红线 */}
      <PageHero
        title="控制台"
        description="管理模型配置、免费额度、密钥与调用测试；点击功能板块切换工作区。"
        crumbs={[{ label: "首页", href: "/" }, { label: "控制台" }]}
      >
        {/* P6（WF-19 / TP-19.1）：三项核心指标。保留 FlowGradient 特效（.flow-layer 总数 15 ≥ e2e 断言 3）
           与三卡精确文案、balance-entry / console-header-stats / console-redeem-entry 钩子。
           tone 语义规则（AT-19.2.2）：资产类=primary、状态类=accent。 */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-testid="console-header-stats">
          <Link
            href="/user/balance"
            aria-label="账户余额，前往余额与充值页"
            className="block h-full rounded-lg transition-[box-shadow,transform] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary hover:-translate-y-0.5 hover:shadow-md"
            data-testid="balance-entry"
          >
            <CoreInfoCard
              compact
              label="账户余额"
              value={`¥${profile.balanceYuan}`}
              tone="primary"
              icon={<Wallet size={14} strokeWidth={2.2} />}
            />
          </Link>
          <CoreInfoCard compact label="当前等级" value={profile.tierLabel} tone="accent" icon={<BadgeCheck size={14} strokeWidth={2.2} />} />
          <CoreInfoCard
            compact
            label="今日 Token 用量"
            value={`${usedToday.toLocaleString()} / ${totalQuota > 0 ? totalQuota.toLocaleString() : "—"}`}
            progress={totalQuota > 0 ? Math.min(100, usedPct) : 0}
            icon={<Activity size={14} strokeWidth={2.2} />}
            tone="accent"
          />
        </div>
        {/* 兑换入口（控制台 MVP 乙）：一键跳转余额页兑换码区块，不重复实现表单 */}
        <div className="mt-3 flex justify-end">
          <Link
            href="/user/balance"
            aria-label="兑换码兑换，前往余额页"
            data-testid="console-redeem-entry"
            className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50/80 px-3 py-1.5 text-xs font-medium text-amber-800 transition-colors hover:border-amber-300 hover:bg-amber-100"
          >
            <Gift size={13} strokeWidth={2.2} />
            兑换码兑换
          </Link>
        </div>
      </PageHero>

      {/* 工作区容器：五板块点击切换（hidden 保持挂载）；通用/专业切换右置于模型配置标题行 */}
      <div className="mt-6">
        <ConsoleWorkspace
          general={<GeneralForm tierMappings={tierMappings} />}
          pro={<ProPrioritiesList priorities={priorities} />}
          quotas={
            <section aria-label="免费额度" className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-base font-semibold text-foreground">免费额度</h2>
              {quotas.length === 0 ? (
                <p className="mt-2 py-3 text-sm text-slate-400" data-testid="free-quota-empty">
                  暂无可用免费额度，权益由系统后台配置
                </p>
              ) : (
                <>
                  {CYCLE_SECTIONS.map(({ cycle, label }) => (
                    <div key={cycle} className="mt-4 first:mt-2">
                      <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        {label}
                      </h3>
                      {groupedQuotas[cycle].length === 0 ? (
                        <p className="py-2 text-sm text-slate-400">暂无 {label} 额度</p>
                      ) : (
                        <ul className="divide-y divide-border">
                          {groupedQuotas[cycle].map((item) => (
                            <li
                              key={`${cycle}-${item.modelId}`}
                              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 text-sm"
                            >
                              <span className="font-semibold text-foreground">{item.modelName}</span>
                              <span className="text-slate-500 tabular-nums">
                                {item.totalQuotaTokens.toLocaleString()} tokens ·{" "}
                                {formatMMDD(item.nextResetAt)} 前重置
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                  <p className="mt-3 text-xs text-slate-400">额度规则由系统后台配置。</p>
                </>
              )}
            </section>
          }
          platformKeys={<ApiKeysPanel />}
          stationKeys={<ApiChannelsPanel />}
          playground={
            <section aria-label="调用测试台" data-testid="console-call-section">
              <h2 className="text-base font-semibold text-foreground">调用测试台</h2>
              <p className="mb-4 mt-1 text-sm text-slate-500">
                从档位/优先级/免费额度中选择模型发起真实调用，核对链路事实头与本次花费；费用流入余额页流水。
              </p>
              <CallPlaygroundLazy
                balanceYuan={profile.balanceYuan}
                tiers={tierMappings.tiers}
                priorities={priorities}
                freeQuotas={freeQuotas}
              />
              {/* WF-23 / AT-23.2：最近调用（复用 usage 明细接口，无新表；日志不可变不提供删除） */}
              <UsageRecentList />
            </section>
          }
          stats={
            <section aria-label="统计报表" data-testid="console-stats-section">
              <h2 className="text-base font-semibold text-foreground">统计报表</h2>
              <p className="mb-4 mt-1 text-sm text-slate-500">
                基于网关调用日汇总（usage_daily_stats）聚合，区间汇总 / 每日趋势 / 模型排行；延迟、缓存与计费路径维度待数据底座扩列后开放。
              </p>
              <UsageStatsPanel />
            </section>
          }
          channels={null}
        />
      </div>
    </main>
  );
}
