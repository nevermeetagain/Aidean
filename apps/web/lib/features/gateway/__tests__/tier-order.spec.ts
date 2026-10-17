/**
 * TASK-076 · 后端红线核验③：通用版等级固定序 + 专业版默认映射（REQ-F-062）
 *
 * 断言唯一真源 @aidean/shared：
 *  - TIER_ORDER = Opus > Sonnet > Fable > Haiku（固定序，需求 §3.6）
 *  - TIER_PRIORITY = {OPUS:1, SONNET:2, FABLE:3, HAIKU:4}（优先级随固定序单调递增）
 *  - schema 枚举 ModelTierLevel 的 wire 映射与优先级一致（OPUS→"1" … HAIKU→"4"）
 *
 * 只读核验：不改业务代码；发现缺陷即登记。
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { TIER_ORDER, TIER_PRIORITY } from "@aidean/shared";

describe("通用版等级固定序与优先级（REQ-F-062）", () => {
  it("TIER_ORDER 为固定序 Opus > Sonnet > Fable > Haiku", () => {
    expect([...TIER_ORDER]).toEqual(["OPUS", "SONNET", "FABLE", "HAIKU"]);
  });

  it("TIER_PRIORITY 精确为 1/2/3/4，且键集与 TIER_ORDER 完全一致", () => {
    expect(TIER_PRIORITY).toEqual({ OPUS: 1, SONNET: 2, FABLE: 3, HAIKU: 4 });
    expect(Object.keys(TIER_PRIORITY).sort()).toEqual([...TIER_ORDER].sort());
  });

  it("优先级沿固定序单调递增（序号越小优先级越高）", () => {
    const priorities = TIER_ORDER.map((t) => TIER_PRIORITY[t]);
    expect(priorities).toEqual([1, 2, 3, 4]);
    for (let i = 1; i < priorities.length; i++) {
      expect(priorities[i]).toBeGreaterThan(priorities[i - 1]);
    }
  });

  it("schema ModelTierLevel 的 wire 映射与优先级一致（OPUS→1 … HAIKU→4）", () => {
    const schema = readFileSync(
      fileURLToPath(new URL("../../../../prisma/schema.prisma", import.meta.url)),
      "utf8",
    );
    const block = schema.match(/enum ModelTierLevel \{([\s\S]*?)\}/);
    expect(block, "ModelTierLevel 枚举缺失").not.toBeNull();
    const body = block?.[1] ?? "";
    const expected: Record<string, string> = { OPUS: "1", SONNET: "2", FABLE: "3", HAIKU: "4" };
    for (const [name, wire] of Object.entries(expected)) {
      const hit = new RegExp(`${name}\\s+@map\\("${wire}"\\)`).test(body);
      expect(hit, `ModelTierLevel.${name} 未按预期映射为 "${wire}"`).toBe(true);
    }
  });
});
