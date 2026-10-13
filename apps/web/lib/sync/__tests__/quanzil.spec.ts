/**
 * QuanzilAdapter 单测。
 * 测试 fetch 数据映射 + testConnection + 错误处理 + 价格计算逻辑。
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../db/prisma", () => ({
  prisma: {},
}));

const { QuanzilAdapter } = await import("../adapters/quanzil");

describe("QuanzilAdapter", () => {
  it("name='quanzil', source='official_api'", () => {
    const adapter = new QuanzilAdapter();
    expect(adapter.name).toBe("quanzil");
    expect(adapter.source).toBe("official_api");
  });

  it("fetch 映射 quanzil.com 模型 → RawModelData（按量计费）", async () => {
    const adapter = new QuanzilAdapter();
    const mockResp = {
      success: true,
      data: [
        {
          model_name: "gpt-6-astra",
          description: "GPT-6 Astra",
          tags: "对话,工具,识图,思考",
          model_type: "对话",
          vendor_id: 52,
          quota_type: 0,
          model_ratio: 5,
          completion_ratio: 5,
          cache_ratio: 0.1,
          available: true,
          created_time: 1788584566,
          usage_count: 29496444465,
          supported_endpoint_types: ["openai"],
        },
        {
          model_name: "gemini-3.8-flash",
          description: "Gemini 3.8 Flash",
          tags: "对话,识图,工具",
          model_type: "对话",
          vendor_id: 67,
          quota_type: 0,
          model_ratio: 0.375,
          completion_ratio: 5,
          available: true,
          supported_endpoint_types: ["gemini", "openai"],
        },
      ],
      vendors: [
        { id: 52, name: "OpenAI", icon: "OpenAI" },
        { id: 67, name: "Google", icon: "Gemini.Color" },
      ],
    };

    vi.spyOn(adapter as never, "fetchJson").mockResolvedValue(mockResp as never);

    const result = await adapter.fetch({ source: "official_api" });

    expect(result).toHaveLength(2);

    // gpt-6-astra: model_ratio=5, completion_ratio=5
    // inputPrice = 5 * 2 = 10 USD/M tokens
    // outputPrice = 5 * 5 * 2 = 50 USD/M tokens
    expect(result[0].modelCode).toBe("gpt-6-astra");
    expect(result[0].vendorName).toBe("OpenAI");
    expect(result[0].inputPrice).toBe(10);
    expect(result[0].outputPrice).toBe(50);
    expect(result[0].currency).toBe("USD");
    expect(result[0].unit).toBe("per_1m_tokens");
    expect(result[0].isMultiModal).toBe(true); // 识图 tag
    expect(result[0].isReasoning).toBe(true); // 思考 tag
    expect(result[0].isCodingOptimized).toBe(true); // 工具 tag
    expect(result[0].apiUrl).toBe("https://quanzil.com/v1/chat/completions");

    // gemini-3.8-flash: model_ratio=0.375, completion_ratio=5
    // inputPrice = 0.375 * 2 = 0.75 USD/M tokens
    // outputPrice = 0.375 * 5 * 2 = 3.75 USD/M tokens
    expect(result[1].modelCode).toBe("gemini-3.8-flash");
    expect(result[1].vendorName).toBe("Google");
    expect(result[1].inputPrice).toBe(0.75);
    expect(result[1].outputPrice).toBe(3.75);
    expect(result[1].isMultiModal).toBe(true); // 识图 tag
    expect(result[1].isReasoning).toBe(false); // no 思考 tag
  });

  it("fetch 映射按次计费模型（quota_type=1）", async () => {
    const adapter = new QuanzilAdapter();
    const mockResp = {
      success: true,
      data: [
        {
          model_name: "gpt-image-2-c",
          tags: "绘画",
          model_type: "图像",
          vendor_id: 93,
          quota_type: 1,
          model_price: 0.12,
          model_ratio: 0,
          completion_ratio: 0,
          available: true,
          supported_endpoint_types: ["openai-绘图"],
        },
      ],
      vendors: [{ id: 93, name: "OpenAI Plus", icon: "OpenAI.Color" }],
    };

    vi.spyOn(adapter as never, "fetchJson").mockResolvedValue(mockResp as never);

    const result = await adapter.fetch({ source: "official_api" });

    expect(result).toHaveLength(1);
    expect(result[0].modelCode).toBe("gpt-image-2-c");
    expect(result[0].inputPrice).toBe(0.12);
    expect(result[0].outputPrice).toBe(0);
    expect(result[0].unit).toBe("per_request");
    expect(result[0].isMultiModal).toBe(true); // 图像 type
  });

  it("fetch 过滤不可用模型", async () => {
    const adapter = new QuanzilAdapter();
    const mockResp = {
      success: true,
      data: [
        { model_name: "active-model", vendor_id: 1, model_ratio: 1, completion_ratio: 1, available: true },
        { model_name: "inactive-model", vendor_id: 1, model_ratio: 1, completion_ratio: 1, available: false },
      ],
      vendors: [{ id: 1, name: "Test" }],
    };

    vi.spyOn(adapter as never, "fetchJson").mockResolvedValue(mockResp as never);

    const result = await adapter.fetch({ source: "official_api" });
    expect(result).toHaveLength(1);
    expect(result[0].modelCode).toBe("active-model");
  });

  it("fetch 抛错当 success=false", async () => {
    const adapter = new QuanzilAdapter();
    vi.spyOn(adapter as never, "fetchJson").mockResolvedValue({ success: false, data: [] } as never);

    await expect(adapter.fetch({ source: "official_api" })).rejects.toThrow();
  });

  it("testConnection 返回 true（可达）", async () => {
    const adapter = new QuanzilAdapter();
    vi.spyOn(adapter as never, "fetchJson").mockResolvedValue({
      success: true,
      data: [{ model_name: "test" }],
    } as never);
    expect(await adapter.testConnection()).toBe(true);
  });

  it("testConnection 返回 false（不可达）", async () => {
    const adapter = new QuanzilAdapter();
    vi.spyOn(adapter as never, "fetchJson").mockRejectedValue(new Error("network") as never);
    expect(await adapter.testConnection()).toBe(false);
  });
});
