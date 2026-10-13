/**
 * dedup 单测（R-23 修复）：同 checksum 跳过、不同 checksum UPSERT。
 */
import { describe, expect, it, vi } from "vitest";

const prismaState = vi.hoisted(() => ({
  modelChangeLog: {
    findFirst: vi.fn(),
  },
}));

vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));

const { shouldSkip } = await import("../../../sync/writers/dedup");

describe("shouldSkip", () => {
  it("返回 false 当无历史变更记录", async () => {
    prismaState.modelChangeLog.findFirst.mockResolvedValue(null);
    const result = await shouldSkip("gpt-4o", "abc123");
    expect(result).toBe(false);
  });

  it("返回 true 当 checksum 完全匹配", async () => {
    prismaState.modelChangeLog.findFirst.mockResolvedValue({
      checksum: "abc123",
      afterData: null,
    });
    const result = await shouldSkip("gpt-4o", "abc123");
    expect(result).toBe(true);
  });

  it("返回 false 当 checksum 不匹配", async () => {
    prismaState.modelChangeLog.findFirst.mockResolvedValue({
      checksum: "old_checksum",
      afterData: null,
    });
    const result = await shouldSkip("gpt-4o", "new_checksum");
    expect(result).toBe(false);
  });

  it("回退到 afterData.checksum 当 checksum 字段为 null", async () => {
    prismaState.modelChangeLog.findFirst.mockResolvedValue({
      checksum: null,
      afterData: { checksum: "fallback_cs" },
    });
    const result = await shouldSkip("gpt-4o", "fallback_cs");
    expect(result).toBe(true);
  });

  it("返回 false 当 afterData 解析失败", async () => {
    prismaState.modelChangeLog.findFirst.mockResolvedValue({
      checksum: null,
      afterData: "not_an_object",
    });
    const result = await shouldSkip("gpt-4o", "any_checksum");
    expect(result).toBe(false);
  });
});
