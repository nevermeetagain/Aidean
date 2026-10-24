/**
 * SourceAttribution —— 第三方数据署名（T120-16 / REQ-M-015 / U-M2）。
 *
 * 用途：凡展示 Artificial Analysis（AA）指数的位置，据其使用条款署名「数据来源：Artificial Analysis」
 * 并链接其官网（https://artificialanalysis.ai）。文案严格采用 U-M2 原文口径，不自拟。
 *
 * 约束：
 * - 无来源（sources 为空/未传）时整体不渲染（「无 AA 数据不出现署名」验收②）；
 * - 外链一律 rel="noopener noreferrer"（防反向窗口劫持 + 不传递引用）；
 * - 配色满足 WCAG 2.1 AA 正文对比度（slate-600 #475569 于白底 ≈ 7.5:1、sky-700 #0369a1 ≈ 7.0:1，均 ≥ 4.5:1），
 *   不沿用页脚/注记的 slate-400（对比不足）。
 */
export interface AttributionSource {
  /** 展示名（AA 固定为 "Artificial Analysis"） */
  name: string;
  /** 官网链接 */
  url: string;
}

export function SourceAttribution({
  sources,
  testId = "source-attribution",
}: {
  sources: AttributionSource[];
  testId?: string;
}) {
  if (!sources || sources.length === 0) return null;
  return (
    <p data-testid={testId} className="mt-3 text-xs leading-relaxed text-slate-600">
      数据来源：
      {sources.map((s, i) => (
        <span key={s.url}>
          {i > 0 ? "、" : null}
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-sky-700 underline underline-offset-2 hover:text-sky-800"
          >
            {s.name}
          </a>
        </span>
      ))}
    </p>
  );
}
