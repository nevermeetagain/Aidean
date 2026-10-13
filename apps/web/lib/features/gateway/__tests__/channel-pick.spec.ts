// 自定义渠道调度纯函数单测（N4 丙：模型匹配 + 优先级 + 加权分摊）。
// 全部为纯函数、无副作用；随机源注入保证加权抽签可复现。
// 解释 A（并发分摊）：单请求单渠道，同级按 weight 加权，失败按「同级重抽→降优先级」级联。
import { describe, expect, it } from "vitest";

import { channelServesModel, pickChannel, weightedPickIndex } from "../channel-pick";

// ==================== channelServesModel ====================

describe("channelServesModel（模型匹配）", () => {
  it("models 为空/undefined/null → 适配全部模型（向后兼容默认）", () => {
    expect(channelServesModel("gpt-4o", [])).toBe(true);
    expect(channelServesModel("gpt-4o", undefined)).toBe(true);
    expect(channelServesModel("gpt-4o", null)).toBe(true);
  });

  it("白名单含请求模型 → true", () => {
    expect(channelServesModel("gpt-4o", ["gpt-4o", "claude-3-5-sonnet"])).toBe(true);
  });

  it("白名单不含请求模型 → false（旧代码无过滤，此即 N4 根因）", () => {
    expect(channelServesModel("deepseek-chat", ["gpt-4o"])).toBe(false);
  });

  it("精确匹配而非子串匹配（gpt-4o 不匹配 gpt-4o-mini）", () => {
    expect(channelServesModel("gpt-4o", ["gpt-4o-mini"])).toBe(false);
  });
});

// ==================== weightedPickIndex ====================

describe("weightedPickIndex（加权抽签）", () => {
  it("权重 [1,1,1] 等概率抽签（注入 random 精确复现三个分支）", () => {
    expect(weightedPickIndex([1, 1, 1], () => 0)).toBe(0);
    expect(weightedPickIndex([1, 1, 1], () => 0.34)).toBe(1);
    expect(weightedPickIndex([1, 1, 1], () => 0.67)).toBe(2);
  });

  it("权重 [1,0,0] 恒选 0 号（零权重不参与）", () => {
    expect(weightedPickIndex([1, 0, 0], () => 0.99)).toBe(0);
  });

  it("权重 [2,1] 长期倾向 0 号（2/3 概率）", () => {
    let picks0 = 0;
    const N = 9000;
    for (let i = 0; i < N; i++) {
      if (weightedPickIndex([2, 1], Math.random) === 0) picks0++;
    }
    // 期望 2/3；宽容差 ±0.05
    expect(picks0 / N).toBeGreaterThan(2 / 3 - 0.05);
    expect(picks0 / N).toBeLessThan(2 / 3 + 0.05);
  });

  it("全 0 权重退化为等概率（不崩溃）", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 100; i++) seen.add(weightedPickIndex([0, 0], Math.random));
    expect(seen.size).toBeGreaterThan(1);
  });
});

// ==================== pickChannel ====================

describe("pickChannel（单请求单渠道调度）", () => {
  it("空候选 → null", () => {
    expect(pickChannel([])).toBeNull();
  });

  it("全部被 exclude → null", () => {
    expect(pickChannel([{ id: "a", priority: 1, weight: 1 }], { excludeIds: ["a"] })).toBeNull();
  });

  it("同级（同 priority）按 weight 加权挑选；高权重更常被选中", () => {
    const cands = [
      { id: "heavy", priority: 10, weight: 9 },
      { id: "light", priority: 10, weight: 1 },
    ];
    let heavy = 0;
    const N = 9000;
    for (let i = 0; i < N; i++) {
      if (pickChannel(cands, { random: Math.random })?.id === "heavy") heavy++;
    }
    expect(heavy / N).toBeGreaterThan(0.85);
    expect(heavy / N).toBeLessThan(0.95);
  });

  it("优先级低数值先：priority=1 优先于 priority=100（旧代码 createdAt asc 无优先级概念）", () => {
    const cands = [
      { id: "low", priority: 1, weight: 1 },
      { id: "high", priority: 100, weight: 999 },
    ];
    expect(pickChannel(cands, { random: () => 0.99 })?.id).toBe("low");
  });

  it("失败级联：exclude 掉低优先级后落到高优先级", () => {
    const cands = [
      { id: "low", priority: 1, weight: 1 },
      { id: "high", priority: 100, weight: 1 },
    ];
    expect(pickChannel(cands, { excludeIds: ["low"] })?.id).toBe("high");
  });

  it("同级剔除后在同级内重抽，不越级", () => {
    const cands = [
      { id: "a", priority: 1, weight: 1 },
      { id: "b", priority: 1, weight: 1 },
      { id: "c", priority: 2, weight: 1 },
    ];
    expect(pickChannel(cands, { excludeIds: ["a"] })?.id).toBe("b");
  });

  it("不修改入参数组（纯函数）", () => {
    const cands = [{ id: "a", priority: 1, weight: 1 }];
    const snapshot = JSON.stringify(cands);
    pickChannel(cands);
    expect(JSON.stringify(cands)).toBe(snapshot);
  });
});