/**
 * HuggingFaceAdapter 单测（R-47）。
 * 测试 fetch 数据映射 + testConnection + 错误处理。
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../db/prisma", () => ({
  prisma: {},
}));

const { HuggingFaceAdapter } = await import("../adapters/huggingface");

describe("HuggingFaceAdapter", () => {
  it("name='huggingface', source='official_api'", () => {
    const adapter = new HuggingFaceAdapter();
    expect(adapter.name).toBe("huggingface");
    expect(adapter.source).toBe("official_api");
  });

  it("fetch 映射 HF API → RawModelData", async () => {
    const adapter = new HuggingFaceAdapter();
    const mockData = {
      data: [
        {
          id: "meta-llama/Llama-3-70B",
          tags: ["transformer", "vision"],
          config: { params: 70_000_000_000 },
          private: false,
          downloads: 500000,
        },
        {
          id: "openai/gpt-4-mini",
          tags: ["transformer"],
          config: { params: 8_000_000_000 },
          private: true,
          downloads: 100000,
        },
      ],
    };

    vi.spyOn(adapter as never, "fetchJson").mockResolvedValue(mockData as never);

    const result = await adapter.fetch({ source: "official_api" });

    expect(result).toHaveLength(2);
    expect(result[0].modelCode).toBe("meta-llama/Llama-3-70B");
    expect(result[0].nameDisplay).toBe("Llama-3-70B");
    expect(result[0].parameterCount).toBe("70.0B");
    expect(result[0].isMultiModal).toBe(true);
    expect(result[0].isOpenSource).toBe(true);
    expect(result[0].officialUrl).toBe("https://huggingface.co/meta-llama/Llama-3-70B");
    expect(result[0].popularityScore).toBe(500000);

    expect(result[1].isOpenSource).toBe(false);
    expect(result[1].isMultiModal).toBe(false);
  });

  it("testConnection 返回 true（可达）", async () => {
    const adapter = new HuggingFaceAdapter();
    vi.spyOn(adapter as never, "fetchJson").mockResolvedValue({ data: [] } as never);
    const result = await adapter.testConnection();
    expect(result).toBe(true);
  });

  it("testConnection 返回 false（不可达）", async () => {
    const adapter = new HuggingFaceAdapter();
    vi.spyOn(adapter as never, "fetchJson").mockRejectedValue(new Error("network error") as never);
    const result = await adapter.testConnection();
    expect(result).toBe(false);
  });

  it("fetch 空 data 数组返回空数组", async () => {
    const adapter = new HuggingFaceAdapter();
    vi.spyOn(adapter as never, "fetchJson").mockResolvedValue({ data: [] } as never);
    const result = await adapter.fetch({ source: "official_api" });
    expect(result).toEqual([]);
  });
});
