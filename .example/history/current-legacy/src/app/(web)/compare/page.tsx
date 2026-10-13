"use client";

import Link from "next/link";
import { GitCompare, Trash2, ArrowRightLeft } from "lucide-react";
import { useLadderStore } from "@/stores";

export default function Page() {
  const compareList = useLadderStore((state) => state.compareList);
  const removeFromCompare = useLadderStore((state) => state.removeFromCompare);
  const clearCompare = useLadderStore((state) => state.clearCompare);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">模型对比</h1>
          <p className="mt-1 text-sm text-slate-500">已选 {compareList.length} 个模型，当前为阶段1最小可用横向对比页。</p>
        </div>
        {compareList.length > 0 && (
          <div className="flex items-center gap-2">
            <Link
              href="/evaluation"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              去测评
              <ArrowRightLeft className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={clearCompare}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              清空
            </button>
          </div>
        )}
      </div>

      {compareList.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <GitCompare className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 text-base font-medium text-slate-900">当前还没有加入对比的模型</p>
          <p className="mt-2 text-sm text-slate-500">请先从榜单或模型详情页选择模型，再返回此页进行横向对比。</p>
          <Link
            href="/models"
            className="mt-6 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            返回天梯图
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">模型</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">厂商</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">综合分</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">详情</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {compareList.map((model) => (
                <tr key={model.id} className="hover:bg-slate-50">
                  <td className="px-4 py-4 text-sm font-semibold text-slate-900">{model.name}</td>
                  <td className="px-4 py-4 text-sm text-slate-600">{model.vendor}</td>
                  <td className="px-4 py-4 text-sm text-slate-600">{model.score.toFixed(1)}</td>
                  <td className="px-4 py-4">
                    <Link href={`/models/${model.id}`} className="text-sm text-blue-600 hover:text-blue-700">
                      查看详情
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => removeFromCompare(model.id)}
                      className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                      移除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
