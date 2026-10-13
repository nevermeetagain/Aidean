/**
 * 聚合采集 adapter 单元测试（R-71）
 *
 * 验证 3 个聚合 adapter + 3 个领域 adapter 的 fetch() 和 testConnection()。
 * Mock fetch 响应，验证 RawModelData[] 字段映射正确性。
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

// L4：fetchJson 现经 safeFetch（SSRF 策略），其中 assertSafeUrl 对域名会发起 DNS 解析。
// 本 spec 用真实常量域名（artificialanalysis.ai 等），须 mock node:dns/promises 保持 hermetic
// （返回公网 IP 通过策略），避免单测依赖真实 DNS（离线/CI 稳定性）。url-policy 自身的
// 真实 DNS 用例在别的 spec 文件，vi.mock 按文件隔离，互不影响。
vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockResponse(data: unknown) {
  // S2 后 fetchJson 经 Response 封顶器；统一返回真实 Response（hermetic）。
  return new Response(JSON.stringify(data), { status: 200 });
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("ArtificialAnalysisAdapter", () => {
  it("fetch() 映射模型数据正确", async () => {
    mockFetch.mockResolvedValue(mockResponse({
      data: [
        {
          model: "gpt-6",
          name: "GPT-6",
          provider: "OpenAI",
          intelligence_score: 95.5,
          context_window: 1050000,
          input_price: 5.0,
          output_price: 15.0,
          open_source: false,
          multimodal: true,
        },
      ],
    }));

    const { ArtificialAnalysisAdapter } = await import("../adapters/artificial-analysis");
    const adapter = new ArtificialAnalysisAdapter();
    const result = await adapter.fetch({ source: "crawler", dryRun: false, options: {} });

    expect(result).toHaveLength(1);
    expect(result[0].modelCode).toBe("gpt-6");
    expect(result[0].benchmarkScore).toBe(95.5);
    expect(result[0].contextLength).toBe(1050000);
    expect(result[0].isMultiModal).toBe(true);
    expect(result[0].isOpenSource).toBe(false);
  });

  it("testConnection() 返回 true 当 API 可达", async () => {
    mockFetch.mockResolvedValue(mockResponse({ data: [{ id: "test", benchmarks: { artificial_analysis: { intelligence_index: 50 } } }] }));
    const { ArtificialAnalysisAdapter } = await import("../adapters/artificial-analysis");
    const adapter = new ArtificialAnalysisAdapter();
    expect(await adapter.testConnection()).toBe(true);
  });

  it("testConnection() 返回 false 当 API 不可达", async () => {
    mockFetch.mockRejectedValue(new Error("network error"));
    const { ArtificialAnalysisAdapter } = await import("../adapters/artificial-analysis");
    const adapter = new ArtificialAnalysisAdapter();
    expect(await adapter.testConnection()).toBe(false);
  });
});

describe("EpochAIAdapter", () => {
  it("fetch() 映射模型数据正确", async () => {
    mockFetch.mockResolvedValue(mockResponse({
      data: [
        {
          model: "llama-4",
          name: "Llama 4",
          organization: "Meta",
          parameters: 400000000000,
          release_date: "2026-04-02",
          open_weights: true,
        },
      ],
    }));

    const { EpochAIAdapter } = await import("../adapters/epochai");
    const adapter = new EpochAIAdapter();
    const result = await adapter.fetch({ source: "crawler", dryRun: false, options: {} });

    expect(result).toHaveLength(1);
    expect(result[0].modelCode).toBe("llama-4");
    expect(result[0].parameterCount).toBe("400.0B");
    expect(result[0].publishedAt).toEqual(new Date("2026-04-02"));
    expect(result[0].isOpenSource).toBe(true);
  });

  it("fetch() API 失败时返回空数组", async () => {
    mockFetch.mockRejectedValue(new Error("API down"));
    const { EpochAIAdapter } = await import("../adapters/epochai");
    const adapter = new EpochAIAdapter();
    const result = await adapter.fetch({ source: "crawler", dryRun: false, options: {} });
    expect(result).toEqual([]);
  });
});

describe("LLMStatsAdapter", () => {
  it("fetch() 映射模型数据正确", async () => {
    mockFetch.mockResolvedValue(mockResponse({
      data: [
        {
          id: "claude-opus-5",
          name: "Claude Opus 5",
          provider: "Anthropic",
          intelligence_score: 92.3,
          popularity_score: 8500,
          input_price: 15.0,
          output_price: 75.0,
          context_window: 200000,
          open_source: false,
          multimodal: true,
        },
      ],
    }));

    const { LLMStatsAdapter } = await import("../adapters/llmstats");
    const adapter = new LLMStatsAdapter();
    const result = await adapter.fetch({ source: "crawler", dryRun: false, options: {} });

    expect(result).toHaveLength(1);
    expect(result[0].modelCode).toBe("claude-opus-5");
    expect(result[0].benchmarkScore).toBe(92.3);
    expect(result[0].popularityScore).toBe(8500);
    expect(result[0].contextLength).toBe(200000);
  });
});

describe("AgentIndexAdapter", () => {
  it("fetch() 映射 Agent 数据正确", async () => {
    mockFetch.mockResolvedValue(mockResponse({
      data: [
        {
          id: "auto-gpt",
          name: "AutoGPT",
          provider: "Significant Gravitas",
          url: "https://agentindex.dev/agents/auto-gpt",
          github_url: "https://github.com/Significant-Gravitas/AutoGPT",
          open_source: true,
          category: "autonomous",
        },
      ],
    }));

    const { AgentIndexAdapter } = await import("../adapters/agentindex");
    const adapter = new AgentIndexAdapter();
    const result = await adapter.fetch({ source: "crawler", dryRun: false, options: {} });

    expect(result).toHaveLength(1);
    expect(result[0].modelCode).toBe("auto-gpt");
    expect(result[0].nameDisplay).toBe("AutoGPT");
    expect(result[0].githubUrl).toContain("github.com");
    expect(result[0].isOpenSource).toBe(true);
  });
});

describe("SmitheryAdapter", () => {
  it("fetch() 映射 MCP Server 数据正确", async () => {
    mockFetch.mockResolvedValue(mockResponse({
      servers: [
        {
          id: "filesystem-mcp",
          name: "Filesystem MCP",
          repository: "https://github.com/modelcontextprotocol/servers",
          url: "https://smithery.ai/servers/filesystem-mcp",
          category: "filesystem",
        },
      ],
    }));

    const { SmitheryAdapter } = await import("../adapters/smithery");
    const adapter = new SmitheryAdapter();
    const result = await adapter.fetch({ source: "crawler", dryRun: false, options: {} });

    expect(result).toHaveLength(1);
    expect(result[0].modelCode).toBe("filesystem-mcp");
    expect(result[0].nameDisplay).toBe("Filesystem MCP");
    expect(result[0].githubUrl).toContain("github.com");
  });
});

describe("SkillsMPAdapter", () => {
  it("fetch() 映射 Skill 数据正确", async () => {
    mockFetch.mockResolvedValue(mockResponse({
      skills: [
        {
          id: "code-review",
          name: "Code Review Skill",
          provider: "Aidean",
          url: "https://skillsmp.com/skills/code-review",
          open_source: true,
          category: "development",
        },
      ],
    }));

    const { SkillsMPAdapter } = await import("../adapters/skillsmp");
    const adapter = new SkillsMPAdapter();
    const result = await adapter.fetch({ source: "crawler", dryRun: false, options: {} });

    expect(result).toHaveLength(1);
    expect(result[0].modelCode).toBe("code-review");
    expect(result[0].nameDisplay).toBe("Code Review Skill");
    expect(result[0].isOpenSource).toBe(true);
  });
});
