"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, Check } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api/client";

const RECHARGE_OPTIONS = [
  { amount: 10, bonus: 0, label: "10元" },
  { amount: 50, bonus: 5, label: "50元" },
  { amount: 100, bonus: 15, label: "100元" },
  { amount: 200, bonus: 40, label: "200元" },
  { amount: 500, bonus: 120, label: "500元" },
  { amount: 1000, bonus: 300, label: "1000元" },
];

export default function UserRechargePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    api.get<{ user: { id: string } }>("/auth/me")
      .then((res) => setUserId(res.user.id))
      .catch(() => {
        localStorage.removeItem("token");
        router.push("/auth/login");
      });
  }, [router]);

  const { data: balanceData } = useApi<{ balance: number; currency: string }>(
    userId ? "/finance/balance" : null
  );

  const balance = balanceData?.balance ?? 0;

  const handleRecharge = async () => {
    if (!selectedAmount || !userId) return;
    setLoading(true);
    try {
      const option = RECHARGE_OPTIONS.find((o) => o.amount === selectedAmount);
      const totalAmount = selectedAmount + (option?.bonus ?? 0);

      await api.post("/finance/transactions", {
        type: "RECHARGE",
        amount: totalAmount,
        description: `充值${selectedAmount}元${option?.bonus ? `，赠送${option.bonus}元` : ""}`,
      });

      alert(`充值成功！到账${totalAmount}元`);
      router.push("/user/transactions");
    } catch (error) {
      console.error("充值失败:", error);
      alert("充值失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  if (!userId) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">账户充值</h1>
        <p className="mt-1 text-sm text-slate-500">当前余额：¥{balance.toFixed(2)}</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-900">选择充值金额</h2>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {RECHARGE_OPTIONS.map((option) => (
              <button
                key={option.amount}
                onClick={() => setSelectedAmount(option.amount)}
                className={`relative rounded-xl border-2 p-4 text-center transition-all ${
                  selectedAmount === option.amount
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {selectedAmount === option.amount && (
                  <div className="absolute right-2 top-2">
                    <Check className="h-4 w-4 text-blue-500" />
                  </div>
                )}
                <div className="text-lg font-bold text-slate-900">{option.label}</div>
                {option.bonus > 0 && (
                  <div className="mt-1 text-xs text-orange-500">送{option.bonus}元</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {selectedAmount && (
          <div className="mb-6 rounded-lg bg-slate-50 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">充值金额</span>
              <span className="font-medium text-slate-900">¥{selectedAmount}</span>
            </div>
            {RECHARGE_OPTIONS.find((o) => o.amount === selectedAmount)?.bonus ? (
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-slate-600">赠送金额</span>
                <span className="font-medium text-orange-500">
                  +¥{RECHARGE_OPTIONS.find((o) => o.amount === selectedAmount)?.bonus}
                </span>
              </div>
            ) : null}
            <div className="mt-3 border-t border-slate-200 pt-3 flex items-center justify-between">
              <span className="font-medium text-slate-900">实际到账</span>
              <span className="text-lg font-bold text-blue-600">
                ¥{selectedAmount + (RECHARGE_OPTIONS.find((o) => o.amount === selectedAmount)?.bonus ?? 0)}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleRecharge}
          disabled={!selectedAmount || loading}
          className={`w-full rounded-xl py-3 text-sm font-semibold transition-colors ${
            selectedAmount
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          } ${loading ? "opacity-50 cursor-wait" : ""}`}
        >
          {loading ? "处理中..." : "立即充值"}
        </button>

        <p className="mt-4 text-center text-xs text-slate-400">
          充值即表示同意《用户协议》和《充值服务条款》
        </p>
      </div>
    </div>
  );
}
