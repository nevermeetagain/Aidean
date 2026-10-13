/**
 * ArenaAIAdapter 单测。
 * 测试 fetch 数据映射 + 多端点降级 + testConnection + 错误处理。
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../db/prisma", () => ({
  prisma: {},
}));

const { ArenaAIAdapter } = await import("../adapters/arena-ai");

describe("ArenaAIAdapter", () => {
  it("name='arena-ai', source='community'", () => {
    const adapter = new ArenaAIAdapter();
    expect(adapter.name).toBe("arena-ai");
    expect(adapter.source).toBe("community");
  });

  it("fetch 通过 OpenRouter 代理映射 artificial_analysis benchmarks", async () => {
    const adapter = new ArenaAIAdapter();
    const mockOpenRouterResp = {
      data: [
        {
          id: "anthropic/claude-sonnet-4",
          name: "Claude Sonnet 4",
          context_length: 200000,
          architecture: {
            input_modalities: ["text", "image"],
            output_modalities: ["text"],
          },
          benchmarks: {
            artificial_analysis: {
              intelligence_index: 72.5,
              coding_index: 68.3,
              agentic_index: 65.0,
            },
          },
        },
        {
          id: "openai/gpt-4o",
          name: "GPT-4o",
          context_length: 128000,
          architecture: { input_modalities: ["text", "image"] },
          benchmarks: {
            artificial_analysis: {
              intelligence_index: 65.2,
              coding_index: 60.1,
            },
          },
        },
        {
          id: "meta/llama-3-8b",
          name: "Llama 3 8B",
          // no benchmarks — should be filtered out
        },
      ],
    };

    const fetchSpy = vi.spyOn(adapter as never, "fetchJson");
    // First call (Gradio) fails, second call (OpenRouter) succeeds
    fetchSpy.mockRejectedValueOnce(new Error("Gradio unreachable") as never);
    fetchSpy.mockResolvedValueOnce(mockOpenRouterResp as never);

    const result = await adapter.fetch({ source: "crawler" });

    expect(result).toHaveLength(2); // only models with artificial_analysis data

    // Claude Sonnet 4
    expect(result[0]!.modelCode).toBe("anthropic/claude-sonnet-4");
    expect(result[0]!.benchmarkScore).toBe(72.5);
    expect(result[0]!.vendorName).toBe("anthropic");
    expect(result[0]!.isMultiModal).toBe(true);
    expect(result[0]!.benchmarks).toBeDefined();
    expect(result[0]!.benchmarks![0]!.benchmarkType).toBe("artificial_analysis");
    expect(result[0]!.benchmarks![0]!.scores!['intelligence_index']).toBe(72.5);
    expect(result[0]!.benchmarks![0]!.scores!['coding_index']).toBe(68.3);
    expect(result[0]!.benchmarks![0]!.scores!['agentic_index']).toBe(65.0);

    // GPT-4o
    expect(result[1]!.modelCode).toBe("openai/gpt-4o");
    expect(result[1]!.benchmarkScore).toBe(65.2);
    expect(result[1]!.benchmarks![0]!.scores!['agentic_index']).toBeUndefined();
  });

  it("fetch 返回空数组当所有源都失败", async () => {
    const adapter = new ArenaAIAdapter();
    vi.spyOn(adapter as never, "fetchJson").mockRejectedValue(new Error("network") as never);

    const result = await adapter.fetch({ source: "crawler" });
    expect(result).toEqual([]);
  });

  it("fetch 返回空数组当 OpenRouter 无 arena 数据", async () => {
    const adapter = new ArenaAIAdapter();
    const fetchSpy = vi.spyOn(adapter as never, "fetchJson");
    fetchSpy.mockRejectedValueOnce(new Error("Gradio unreachable") as never);
    fetchSpy.mockResolvedValueOnce({ data: [{ id: "test", name: "Test" }] } as never);

    const result = await adapter.fetch({ source: "crawler" });
    expect(result).toEqual([]);
  });

  it("testConnection 返回 true（OpenRouter 有 arena 数据）", async () => {
    const adapter = new ArenaAIAdapter();
    vi.spyOn(adapter as never, "fetchJson").mockResolvedValue({
      data: [
        { id: "test", benchmarks: { artificial_analysis: { intelligence_index: 50 } } },
      ],
    } as never);
    expect(await adapter.testConnection()).toBe(true);
  });

  it("testConnection 返回 false（OpenRouter 无 arena 数据）", async () => {
    const adapter = new ArenaAIAdapter();
    vi.spyOn(adapter as never, "fetchJson").mockResolvedValue({
      data: [{ id: "test" }],
    } as never);
    expect(await adapter.testConnection()).toBe(false);
  });

  it("testConnection 返回 false（网络错误）", async () => {
    const adapter = new ArenaAIAdapter();
    vi.spyOn(adapter as never, "fetchJson").mockRejectedValue(new Error("network") as never);
    expect(await adapter.testConnection()).toBe(false);
  });
});
