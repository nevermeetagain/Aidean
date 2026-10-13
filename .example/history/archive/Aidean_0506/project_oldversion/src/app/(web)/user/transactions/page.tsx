"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { History, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api/client";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description?: string;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  RECHARGE: "充值",
  CONSUME: "消费",
  REFUND: "退款",
  REWARD: "奖励",
};

export default function UserTransactionsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

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

  const { data: transactionsData } = useApi<{ items: Transaction[]; total: number }>(
    userId ? "/finance/transactions" : null
  );

  const transactions = transactionsData?.items || [];

  if (!userId) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">消费记录</h1>
        <p className="mt-1 text-sm text-slate-500">共 {transactions.length} 条记录</p>
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <History className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 text-slate-500">暂无消费记录</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">类型</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">金额</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">余额</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">说明</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx) => {
                const isIncome = tx.type === "RECHARGE" || tx.type === "REFUND" || tx.type === "REWARD";
                return (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isIncome ? (
                          <ArrowDownLeft className="h-4 w-4 text-green-500" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm font-medium text-slate-900">
                          {TYPE_LABELS[tx.type] || tx.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-semibold ${isIncome ? "text-green-600" : "text-red-600"}`}>
                        {isIncome ? "+" : "-"}¥{Math.abs(tx.amount).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">¥{tx.balanceAfter.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-500">{tx.description || "-"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-500">
                        {new Date(tx.createdAt).toLocaleString("zh-CN")}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
