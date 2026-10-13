/**
 * LMSysAdapter 单测（R-47）。
 * 测试 fetch 数据映射 + 多端点降级 + testConnection + 错误处理。
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../db/prisma", () => ({
  prisma: {},
}));

const { LMSysAdapter } = await import("../adapters/lmsys");

describe("LMSysAdapter", () => {
  it("name='lmsys', source='community'", () => {
    const adapter = new LMSysAdapter();
    expect(adapter.name).toBe("lmsys");
    expect(adapter.source).toBe("community");
  });

  it("fetch 映射 LMSys arena → RawModelData（主端点可达）", async () => {
    const adapter = new LMSysAdapter();
    const mockData = {
      data: [
        {
          modelCode: "gpt-4o",
          arenaScore: 1287,
          organization: "OpenAI",
          license: "Proprietary",
        },
        {
          modelCode: "claude-3.5-sonnet",
          arenaScore: 1271,
          organization: "Anthropic",
          license: "MIT",
        },
      ],
    };

    vi.spyOn(adapter as never, "fetchJson").mockResolvedValue(mockData as never);

    const result = await adapter.fetch({ source: "crawler" });

    expect(result).toHaveLength(2);
    expect(result[0].modelCode).toBe("gpt-4o");
    expect(result[0].benchmarkScore).toBe(1287);
    expect(result[0].isOpenSource).toBe(false);

    expect(result[1].benchmarkScore).toBe(1271);
    expect(result[1].isOpenSource).toBe(true);
  });

  it("testConnection 返回 true（OpenRouter 代理有 arena 数据）", async () => {
    const adapter = new LMSysAdapter();
    vi.spyOn(adapter as never, "fetchJson").mockResolvedValue({
      data: [
        { id: "test", benchmarks: { artificial_analysis: { intelligence_index: 50 } } },
      ],
    } as never);
    const result = await adapter.testConnection();
    expect(result).toBe(true);
  });

  it("testConnection 返回 false（不可达）", async () => {
    const adapter = new LMSysAdapter();
    vi.spyOn(adapter as never, "fetchJson").mockRejectedValue(new Error("timeout") as never);
    const result = await adapter.testConnection();
    expect(result).toBe(false);
  });

  it("fetch 直接数组格式（无 data 包裹）", async () => {
    const adapter = new LMSysAdapter();
    const mockData = [
      { modelCode: "gemini-pro", arenaScore: 1260 },
    ];
    vi.spyOn(adapter as never, "fetchJson").mockResolvedValue(mockData as never);
    const result = await adapter.fetch({ source: "crawler" });
    expect(result).toHaveLength(1);
    expect(result[0].modelCode).toBe("gemini-pro");
    expect(result[0].benchmarkScore).toBe(1260);
  });

  it("fetch 降级到 OpenRouter 代理当主端点失败", async () => {
    const adapter = new LMSysAdapter();
    const fetchSpy = vi.spyOn(adapter as never, "fetchJson");
    // Primary endpoint fails
    fetchSpy.mockRejectedValueOnce(new Error("unreachable") as never);
    // Gradio endpoint fails
    fetchSpy.mockRejectedValueOnce(new Error("unreachable") as never);
    // OpenRouter proxy succeeds
    fetchSpy.mockResolvedValueOnce({
      data: [
        {
          id: "openai/gpt-4o",
          name: "GPT-4o",
          benchmarks: { artificial_analysis: { intelligence_index: 65.2 } },
        },
      ],
    } as never);

    const result = await adapter.fetch({ source: "crawler" });
    expect(result).toHaveLength(1);
    expect(result[0].modelCode).toBe("openai/gpt-4o");
    expect(result[0].benchmarkScore).toBe(65.2);
  });

  it("fetch 返回空数组当所有端点都失败", async () => {
    const adapter = new LMSysAdapter();
    vi.spyOn(adapter as never, "fetchJson").mockRejectedValue(new Error("network") as never);
    const result = await adapter.fetch({ source: "crawler" });
    expect(result).toEqual([]);
  });
});
