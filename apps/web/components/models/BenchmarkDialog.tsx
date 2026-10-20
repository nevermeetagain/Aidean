"use client";

/**
 * 模型详情 · 基准测试列表 + 详情弹窗（TASK-074；需求 §3 详情页「基准以弹窗呈现，含来源与核验状态」）。
 *
 * 列表每行：来源徽标 / 核验徽标 / 基准名（可点击）/ 总分；点击基准名打开 @aidean/ui Dialog：
 *   指标得分表、总分与分位、来源名称·版本·测试日期·样本数、外链（仅 http(s)）、演示数据提示（verifiedStatus≠1）。
 * 四态：空（bench-empty，「暂无基准数据」）/ 成功（bench-list）；加载与错误态由 RSC 直出与页面降级承担（数据随详情页一次取回），
 *   弹窗内对缺失字段逐项显示「—」而不是报错。
 * 数据由服务端序列化传入（不在客户端二次请求）。
 */
import { useState } from "react";

import { Dialog } from "@aidean/ui";

export interface BenchmarkView {
  id: string;
  name: string;
  subType: string | null;
  sourceLabel: string;
  sourceName: string | null;
  sourceUrl: string | null;
  sourceVersion: string | null;
  totalScore: number;
  percentile: number | null;
  testDate: string | null;
  sampleCount: number | null;
  verified: boolean;
  scores: Array<[string, string]>;
}

const VERIFIED = {
  true: { label: "✓ 已核验", cls: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  false: { label: "演示数据", cls: "border-amber-300 bg-amber-50 text-amber-700" },
} as const;

const BADGE = "inline-flex items-center rounded-full border px-2 py-0.5 text-xs";
const isHttp = (u: string | null): u is string => !!u && /^https?:\/\//.test(u);

const SH_DAY = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" });
const fmtDay = (iso: string | null) => (iso && !Number.isNaN(new Date(iso).getTime()) ? SH_DAY.format(new Date(iso)) : "—");

export function BenchmarkList({ items }: { items: BenchmarkView[] }) {
  const [open, setOpen] = useState<BenchmarkView | null>(null);

  if (items.length === 0) {
    return (
      <p data-testid="bench-empty" className="mt-4 rounded-md border border-[var(--border)] bg-[var(--card)] px-4 py-6 text-center text-sm text-slate-500">
        暂无基准数据
      </p>
    );
  }

  return (
    <>
      <ul data-testid="bench-list" className="mt-4 divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)]">
        {items.map((b) => {
          const v = VERIFIED[b.verified ? "true" : "false"];
          return (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className={`${BADGE} border-[var(--border)] bg-muted text-slate-600`}>{b.sourceLabel}</span>
                <span className={`${BADGE} font-medium ${v.cls}`}>{v.label}</span>
                <button
                  type="button"
                  data-testid="bench-open"
                  onClick={() => setOpen(b)}
                  className="truncate text-left text-sm font-semibold text-slate-700 underline-offset-4 hover:text-primary hover:underline"
                  aria-haspopup="dialog"
                >
                  {b.name}
                  {b.subType ? <span className="ml-1 font-normal text-slate-400">· {b.subType}</span> : null}
                </button>
              </div>
              <span className="text-sm font-bold tabular-nums text-primary">{b.totalScore.toFixed(1)}</span>
            </li>
          );
        })}
      </ul>

      <Dialog
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open ? `${open.name}${open.subType ? ` · ${open.subType}` : ""}` : ""}
        className="max-w-lg"
      >
        {open ? (
          <div data-testid="bench-dialog" className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`${BADGE} border-[var(--border)] bg-muted text-slate-600`}>{open.sourceLabel}</span>
              <span className={`${BADGE} font-medium ${VERIFIED[open.verified ? "true" : "false"].cls}`}>{VERIFIED[open.verified ? "true" : "false"].label}</span>
              <span className="ml-auto text-lg font-bold tabular-nums text-primary">
                {open.totalScore.toFixed(1)}
                {open.percentile !== null ? <span className="ml-1 text-xs font-normal text-slate-400">前 {Math.max(0, 100 - open.percentile).toFixed(0)}%</span> : null}
              </span>
            </div>

            {!open.verified ? (
              <p data-testid="bench-demo-note" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                该条为演示/未核验数据，仅用于展示呈现形态，不作为选型依据。
              </p>
            ) : null}

            {open.scores.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400">
                    <th scope="col" className="py-1 font-medium">指标</th>
                    <th scope="col" className="py-1 text-right font-medium">得分</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600">
                  {open.scores.map(([k, v]) => (
                    <tr key={k} className="border-t border-[var(--border)]">
                      <td className="py-1.5">{k}</td>
                      <td className="py-1.5 text-right font-mono tabular-nums">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-slate-400">该基准未提供分项指标。</p>
            )}

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div><dt className="text-slate-400">来源</dt><dd className="text-slate-700">{open.sourceName ?? "—"}</dd></div>
              <div><dt className="text-slate-400">版本</dt><dd className="text-slate-700">{open.sourceVersion ?? "—"}</dd></div>
              <div><dt className="text-slate-400">测试日期</dt><dd className="text-slate-700">{fmtDay(open.testDate)}</dd></div>
              <div><dt className="text-slate-400">样本数</dt><dd className="text-slate-700">{open.sampleCount ?? "—"}</dd></div>
            </dl>

            {isHttp(open.sourceUrl) ? (
              <a href={open.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-block text-xs text-primary hover:underline">
                查看原始来源 ↗
              </a>
            ) : null}
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
