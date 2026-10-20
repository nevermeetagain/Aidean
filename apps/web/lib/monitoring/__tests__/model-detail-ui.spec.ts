/**
 * TASK-067/074：模型详情「在哪里可调用」/基准弹窗/测评示例 —— 纯逻辑与静态渲染单测（E10-09：组件测试只能落 lib/**）。
 * 交互（弹窗开关、展开全文、重试）由 TASK-075 e2e 断言。
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// @aidean/ui 在 vitest 下解析到包内独立 react 副本（hooks 报 null dispatcher）；Dialog 关闭态本就不渲染内容，此处以空组件替身
vi.mock("@aidean/ui", () => ({ Dialog: () => null }));

import { fmtOrigin, ModelOfferings, summarize, unitLabel } from "../../../components/models/ModelOfferings";
import { BenchmarkList, type BenchmarkView } from "../../../components/models/BenchmarkDialog";
import { EvaluationExamples, EvaluationExamplesSkeleton } from "../../../components/models/EvaluationExamples";

const it0 = (over: Record<string, unknown> = {}) => ({
  sourceKey: "openrouter", sourceLabel: "OpenRouter", tier: "S2" as const, kind: "aggregator", isListed: true, identityVerified: true,
  priceUnit: "usd_per_1m_tokens" as const, priceInput: "2.5", priceOutput: "10", firstSeenAt: "2026-10-01T00:00:00.000Z",
  lastSeenAt: "2026-10-19T00:00:00.000Z", sourceUrl: "https://openrouter.ai/models", attribution: null, ...over,
});

describe("ModelOfferings 辅助", () => {
  it("fmtOrigin：原币原单位（CNY 源才显示 ¥，不做汇率换算）、去尾随 0、0→免费（ratio 除外）、null→—", () => {
    expect(fmtOrigin("2.500000", "usd_per_1m_tokens")).toBe("$2.5");
    expect(fmtOrigin("0", "usd_per_1m_tokens")).toBe("免费");
    expect(fmtOrigin("0.8", "ratio")).toBe("×0.8");
    expect(fmtOrigin("3", "cny_per_1m_tokens")).toBe("¥3");
    expect(fmtOrigin(null, "usd_per_1m_tokens")).toBe("—");
    expect(fmtOrigin("10", null)).toBe("10");
  });
  it("summarize：最低价只在身份已验证源中取；全为中转时才取中转", () => {
    const mixed = summarize([it0({ sourceKey: "relay", priceInput: "0.4", identityVerified: false }), it0({ sourceKey: "or", priceInput: "0.8" })]);
    expect(mixed.cheapest?.sourceKey).toBe("or");
    const onlyRelay = summarize([it0({ sourceKey: "relay", priceInput: "0.4", identityVerified: false })]);
    expect(onlyRelay.cheapest?.sourceKey).toBe("relay");
  });
  it("unitLabel 覆盖 4 种单位与缺省", () => {
    expect(unitLabel("usd_per_1m_tokens")).toBe("USD / 1M Tokens");
    expect(unitLabel("usd_per_request")).toBe("USD / 次");
    expect(unitLabel(null)).toBe("单位未公开");
  });
  it("summarize：只计在架源；最低输入价只在 USD/1M 同单位内比较", () => {
    const s = summarize([
      it0({ sourceKey: "a", priceInput: "3" }),
      it0({ sourceKey: "b", priceInput: "2", isListed: false }),
      it0({ sourceKey: "c", priceInput: "0.1", priceUnit: "ratio" }),
      it0({ sourceKey: "d", priceInput: "2.4" }),
    ]);
    expect(s.listed).toBe(3);
    expect(s.cheapest?.sourceKey).toBe("d");
  });
  it("首屏 SSR 为 offerings-loading 态（客户端再取数）", () => {
    expect(renderToStaticMarkup(createElement(ModelOfferings, { modelId: "m1" }))).toContain('data-testid="offerings-loading"');
  });
});

const bench = (over: Partial<BenchmarkView> = {}): BenchmarkView => ({
  id: "b1", name: "MMLU", subType: null, sourceLabel: "官方", sourceName: "MMLU", sourceUrl: "https://example.com", sourceVersion: "v1",
  totalScore: 86.4, percentile: 90, testDate: "2026-09-01T00:00:00.000Z", sampleCount: 1000, verified: false, scores: [["acc", "86.4"]], ...over,
});

describe("BenchmarkList", () => {
  it("空 → bench-empty「暂无基准数据」", () => {
    const out = renderToStaticMarkup(createElement(BenchmarkList, { items: [] }));
    expect(out).toContain('data-testid="bench-empty"');
  });
  it("列表：基准名为可点按钮（aria-haspopup=dialog）、核验徽标与总分", () => {
    const out = renderToStaticMarkup(createElement(BenchmarkList, { items: [bench(), bench({ id: "b2", name: "GSM8K", verified: true, totalScore: 92 })] }));
    expect(out).toContain('data-testid="bench-list"');
    expect((out.match(/data-testid="bench-open"/g) ?? []).length).toBe(2);
    expect(out).toContain('aria-haspopup="dialog"');
    expect(out).toContain("演示数据");
    expect(out).toContain("✓ 已核验");
    expect(out).toContain("92.0");
  });
});

describe("EvaluationExamples", () => {
  const ex = {
    id: "e1", title: "写一首诗", prompt: "以秋天为题写一首七言绝句", completedAt: "2026-10-01T00:00:00.000Z", winnerModelId: "m2", isDemo: true,
    answers: [
      { modelId: "m1", modelName: "Model One", modelSlug: "model-one", response: "<script>alert(1)</script>" + "长".repeat(400), latencyMs: 1200, tokensTotal: 300, score: 8.5 },
      { modelId: "m2", modelName: "Model Two", modelSlug: "model-two", response: "秋风", latencyMs: null, tokensTotal: 0, score: null },
    ],
  };
  it("ready：多模型并排、本模型/胜出标注、长回答折叠、HTML 被转义", () => {
    const out = renderToStaticMarkup(createElement(EvaluationExamples, { examples: [ex], currentModelId: "m1" }));
    expect(out).toContain('data-testid="samples-ready"');
    expect((out.match(/data-testid="samples-answer"/g) ?? []).length).toBe(2);
    expect(out).toContain("本模型");
    expect(out).toContain("胜出");
    expect(out).toContain("展开全文");
    expect(out).not.toContain("<script>");
    expect(out).toContain("&lt;script&gt;");
    expect(out).toContain('href="/models/model-two"');
    expect(out).toContain('data-testid="samples-demo-badge"');
    expect(renderToStaticMarkup(createElement(EvaluationExamples, { examples: [{ ...ex, isDemo: false }], currentModelId: "m1" }))).not.toContain("samples-demo-badge");
  });
  it("empty / error / loading 三态", () => {
    expect(renderToStaticMarkup(createElement(EvaluationExamples, { examples: [], currentModelId: "m1" }))).toContain('data-testid="samples-empty"');
    expect(renderToStaticMarkup(createElement(EvaluationExamples, { examples: [], currentModelId: "m1", error: true }))).toContain('data-testid="samples-error"');
    expect(renderToStaticMarkup(createElement(EvaluationExamplesSkeleton))).toContain('data-testid="samples-loading"');
  });
});
