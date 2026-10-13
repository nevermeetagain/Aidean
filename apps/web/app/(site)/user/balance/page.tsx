// /user/balance —— 余额与充值（Task B.4.1 / WP-FE01 用量明细接线）。
// RSC 取数（walletService 读侧门面）+ RechargePanel 客户端下单交互；
// 流水按自然日分组展示（billing.getLedgerPage 已归组），分页走 searchParams。
// WP-FE01：追加「用量明细」区块（UsageLedger，消费 GET /api/v1/user/usage），
// 使「冻结/可用余额 ↔ 流水 ↔ 每次调用 token 与金额」三段可对账。
import Link from "next/link";
import { redirect } from "next/navigation";

import { requireUser, type SessionContext } from "../../../../lib/features/auth/session";
import { walletService } from "../../../../lib/features/wallet/service";
import { billingService } from "../../../../lib/features/billing/service";
import type { LedgerDateGroup, LedgerEntryView } from "@aidean/shared";
import { CoreInfoCard } from "../../../../components/console/CoreInfoCard";
import { PageHero } from "../../../../components/common/PageHero";
import { RedeemCard } from "../../../../components/console/RedeemCard";
import { RechargePanel } from "../../../../components/console/RechargePanel";
import { UsageLedger } from "../../../../components/console/UsageLedger";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type OrderView = Awaited<ReturnType<typeof billingService.listRechargeOrders>>[number];

/** 订单状态 → 中文徽标文案 */
function orderStatusText(status: string): string {
  const map: Record<string, string> = {
    PENDING: "待支付",
    PAID: "已支付",
    FAILED: "失败",
    EXPIRED: "已过期",
    REFUNDED: "已退款",
  };
  return map[status] ?? status;
}

/** 流水类型 → 中文文案 */
function entryTypeText(type: string): string {
  const map: Record<string, string> = {
    TOPUP: "充值",
    CONSUME: "消费",
    REFUND: "退款",
    REVERSAL: "冲正",
    GRANT: "赠送",
    EXPIRE: "过期",
    ADJUST: "调整",
  };
  return map[type] ?? type;
}

export default async function BalancePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  let user: SessionContext;
  try {
    user = await requireUser("/user/balance");
  } catch {
    redirect("/login");
  }

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const [wallet, ledger, orders] = await Promise.all([
    walletService.getWalletView(user.userId),
    walletService.getLedgerPage(user.userId, { page, pageSize: PAGE_SIZE }),
    walletService.listRechargeOrders(user.userId),
  ]);

  const totalPages = Math.max(1, Math.ceil(ledger.total / PAGE_SIZE));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-14 pt-0 md:px-6">
      <PageHero
        title="余额"
        description="查看账户余额与可用余额，进行兑换码兑换、余额充值，并逐笔核对消费流水与用量明细。"
        crumbs={[{ label: "首页", href: "/" }, { label: "控制台", href: "/user/console" }, { label: "余额" }]}
      />

      {/* 核心信息卡：沿用 FlowGradient 特效结构（reduced-motion 由 FlowGradient 内部降级） */}
      <section aria-label="钱包概览" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CoreInfoCard label="账户余额" value={`¥${wallet.balanceYuan}`} tone="primary" />
        <CoreInfoCard
          label="可用余额"
          value={`¥${wallet.availableYuan}`}
          hint={`冻结中 ¥${wallet.heldYuan}（预扣待结算）`}
          tone="accent"
        />
        <CoreInfoCard label="币种" value={wallet.currency} hint="充值档位见下方" tone="accent" />
      </section>

      {/* 兑换码入口：余额码入账 / 套餐码开通（SubTask 3.4.2） */}
      <section aria-label="兑换码兑换" className="mt-8 rounded-lg border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">兑换码兑换</h2>
        <p className="mb-3 mt-1 text-sm text-slate-500">输入兑换码即时入账或开通套餐；每分钟最多尝试 5 次。</p>
        <RedeemCard />
      </section>

      {/* 充值面板：五档选择 + 下单（client 组件） */}
      <section aria-label="余额充值" className="mt-8 rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">余额充值</h2>
          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            仅兑换码
          </span>
        </div>
        <RechargePanel
          isDev={process.env.NODE_ENV !== "production"}
          tiers={billingService.listRechargeTiers()}
        />
      </section>

      {/* 充值订单 */}
      <section aria-label="充值订单" className="mt-8 rounded-lg border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">充值订单</h2>
        {orders.length === 0 ? (
          <p className="mt-2 py-3 text-sm text-slate-400">暂无充值订单</p>
        ) : (
          <ul className="divide-y divide-border">
            {orders.map((o: OrderView) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 text-sm">
                <span className="font-semibold text-foreground">¥{o.totalYuan}</span>
                <span className="text-slate-500">
                  {o.payMethod === "WECHAT" ? "微信" : "支付宝"} · {orderStatusText(o.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 消费记录：按日期分组（需求 §3.5）；空态与分页 */}
      <section aria-label="消费记录" className="mt-8 rounded-lg border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">消费记录</h2>
        {ledger.groups.length === 0 ? (
          <p className="mt-2 py-3 text-sm text-slate-400">暂无收支流水</p>
        ) : (
          <>
            {ledger.groups.map((g: LedgerDateGroup) => (
              <div key={g.date} className="mt-4 first:mt-2">
                <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {g.date}
                </h3>
                <ul className="divide-y divide-border">
                  {g.entries.map((e: LedgerEntryView) => (
                    <li key={e.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 text-sm">
                      <span className="font-semibold text-foreground">
                        {entryTypeText(e.entryType)}
                        <span className="ml-2 text-xs font-normal text-slate-400">{e.status}</span>
                      </span>
                      <span
                        className={`tabular-nums ${
                          e.direction === "CREDIT" ? "text-emerald-600" : "text-slate-700"
                        }`}
                        data-testid="ledger-amount"
                      >
                        {e.direction === "CREDIT" ? "+" : "−"}¥{e.amountYuan}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {totalPages > 1 ? (
              <nav aria-label="流水分页" className="mt-4 flex items-center gap-3 text-sm">
                {page > 1 ? (
                  <Link href={`/user/balance?page=${page - 1}`} className="text-primary hover:underline">
                    上一页
                  </Link>
                ) : (
                  <span className="text-slate-300">上一页</span>
                )}
                <span className="text-slate-500">
                  {page} / {totalPages}
                </span>
                {page < totalPages ? (
                  <Link href={`/user/balance?page=${page + 1}`} className="text-primary hover:underline">
                    下一页
                  </Link>
                ) : (
                  <span className="text-slate-300">下一页</span>
                )}
              </nav>
            ) : null}
          </>
        )}
      </section>

      {/* 用量明细（WP-FE01）：每次调用的 token / 金额 / 计费路径 / 延迟，与上方流水互为对账 */}
      <section aria-label="用量明细" className="mt-8 rounded-lg border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">用量明细</h2>
        <p className="mb-3 mt-1 text-sm text-slate-500">
          按时间倒序展示每次网关调用的 token 与扣费；金额与上方消费记录同口径，可用于逐笔对账。
        </p>
        <UsageLedger />
      </section>
    </main>
  );
}
