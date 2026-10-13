"use client";

// 充值面板（Task B.4.1）：五档选择 + 支付方式 + 下单。
// dev 环境下单成功后提供「模拟支付」按钮（POST mock-pay，服务端代拟签名走标准回调链路）；
// 生产环境支付入口已关闭（R-57：商户凭据未接入前不展示充值按钮），仅展示档位预览 + 提示文案。
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@aidean/ui";

interface TierOption {
  id: string;
  label: string;
  amountYuan: string;
  bonusYuan: string;
}

interface RechargePanelProps {
  tiers: TierOption[];
  /** 仅非生产渲染模拟支付按钮 */
  isDev: boolean;
}

type Envelope<T> = { code: number; message: string; data: T | null };

interface OrderCreated {
  order: { id: string; status: string; totalYuan: string };
  payment: { payUrl: string };
}

export function RechargePanel({ tiers, isDev }: RechargePanelProps) {
  const router = useRouter();
  const [tierId, setTierId] = useState(tiers[1]?.id ?? tiers[0]?.id ?? "");
  const [payMethod, setPayMethod] = useState<"WECHAT" | "ALIPAY">("WECHAT");
  const [order, setOrder] = useState<OrderCreated["order"] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createOrder() {
    setBusy(true);
    setError(null);
    setOrder(null);
    try {
      const res = await fetch("/api/v1/billing/recharge-orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tierId, payMethod }),
      });
      const body = (await res.json()) as Envelope<OrderCreated>;
      if (body.code !== 0 || !body.data) {
        setError(body.message || "下单失败");
        return;
      }
      setOrder(body.data.order);
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  async function mockPay(orderId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/billing/recharge-orders/${orderId}/mock-pay`, {
        method: "POST",
      });
      const body = (await res.json()) as Envelope<{ status: string }>;
      if (body.code !== 0 || !body.data) {
        setError(body.message || "模拟支付失败");
        return;
      }
      setOrder((prev) => (prev ? { ...prev, status: body.data!.status } : prev));
      router.refresh(); // 服务端余额/流水重新取数
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      <div role="radiogroup" aria-label="充值档位" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tiers.map((t) => {
          const active = t.id === tierId;
          return (
            <Button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={active}
              variant="ghost"
              onClick={() => setTierId(t.id)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                active
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <span className="block text-xs text-slate-500">{t.label}</span>
              <span className="mt-1 block text-lg font-bold tabular-nums text-foreground">
                ¥{t.amountYuan}
              </span>
              {t.bonusYuan !== "0.00" ? (
                <span className="mt-0.5 block text-xs text-emerald-600">赠 ¥{t.bonusYuan}</span>
              ) : null}
            </Button>
          );
        })}
      </div>

      {isDev ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div role="radiogroup" aria-label="支付方式" className="flex gap-2">
              {(["WECHAT", "ALIPAY"] as const).map((m) => (
                <Button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={payMethod === m}
                  variant="ghost"
                  onClick={() => setPayMethod(m)}
                  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    payMethod === m ? "border-primary text-primary" : "border-border text-slate-500"
                  }`}
                >
                  {m === "WECHAT" ? "微信支付" : "支付宝"}
                </Button>
              ))}
            </div>
            <Button
              type="button"
              onClick={createOrder}
              disabled={busy || !tierId}
              variant="primary"
              className="px-4 py-1.5"
            >
              {busy ? "处理中…" : "立即充值"}
            </Button>
          </div>

          {error ? (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {error}
            </p>
          ) : null}

          {order ? (
            <div className="mt-4 rounded-md border border-border p-3 text-sm" data-testid="recharge-order">
              <p>
                订单已创建（{order.totalYuan} 元），状态：{order.status}
              </p>
              {order.status === "PENDING" ? (
                <Button
                  type="button"
                  onClick={() => mockPay(order.id)}
                  disabled={busy}
                  variant="ghost"
                  className="mt-2 rounded-md border border-primary px-3 py-1.5 text-xs text-primary transition-opacity disabled:opacity-50"
                >
                  模拟支付成功（dev）
                </Button>
              ) : (
                <p className="mt-1 text-emerald-600">支付完成，余额已入账</p>
              )}
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-4 rounded-md border border-dashed border-border p-4 text-center">
          <p className="text-sm font-medium text-foreground">当前仅支持兑换码充值</p>
          <p className="mt-1 text-xs text-slate-500">
            在线支付入口暂未开放（支付资质与对账流程筹备中）；
            如需充值请使用上方兑换码，或联系运营获取兑换码。
          </p>
        </div>
      )}
    </div>
  );
}
