/**
 * Discovery Pipeline 单元测试。
 *
 * 测试类型契约和纯逻辑函数，不依赖真实数据库连接。
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { extractPricing } from "../pricing-extraction";
import type {
  Candidate,
  FingerprintResult,
  ProtocolProbeResult,
  SourceType,
  CandidateType,
} from "../types";

describe("discovery types — 契约验证", () => {
  it("SourceType 包含所有发现源", () => {
    const sources: SourceType[] = ["registry", "search", "github", "news", "crawl"];
    expect(sources).toHaveLength(5);
  });

  it("Candidate 包含必要字段", () => {
    const candidate: Candidate = {
      candidateType: "provider",
      name: "OpenAI",
      domain: "api.openai.com",
      apiBase: "https://api.openai.com/v1",
      sourceType: "registry",
      sourceUrl: "https://registry.example.com/openai",
    };
    expect(candidate.candidateType).toBe("provider");
    expect(candidate.sourceType).toBe("registry");
  });

  it("CandidateType 枚举: provider | gateway | model | tool", () => {
    const types: CandidateType[] = ["provider", "gateway", "model", "tool"];
    expect(types).toHaveLength(4);
  });

  it("FingerprintResult 包含端点检测结果", () => {
    const result: FingerprintResult = {
      hasModelsEndpoint: true,
      hasChatEndpoint: true,
      hasResponsesEndpoint: false,
      hasMessagesEndpoint: false,
      authMethod: "bearer",
      modelsFormat: "openai",
      pricingPageFound: false,
      probedAt: new Date().toISOString(),
    };
    expect(result.hasModelsEndpoint).toBe(true);
    expect(result.modelsFormat).toBe("openai");
  });

  it("ProtocolProbeResult 包含协议探测结果", () => {
    const result: ProtocolProbeResult = {
      protocol: "openai_chat",
      supported: true,
      probeMethod: "endpoint_check",
      confidence: 0.9,
      detail: { endpoint: "/v1/chat/completions" },
    };
    expect(result.protocol).toBe("openai_chat");
    expect(result.supported).toBe(true);
  });
});

describe("entity-resolution — 域名规范化逻辑", () => {
  it("去除协议前缀", () => {
    const normalize = (d: string) => d.replace(/^https?:\/\//, "").replace(/\/$/, "");
    expect(normalize("https://api.openai.com/")).toBe("api.openai.com");
    expect(normalize("http://localhost:8080")).toBe("localhost:8080");
  });

  it("名称相似度 — Jaccard 系数", () => {
    const jaccard = (a: string, b: string) => {
      const setA = new Set(a.toLowerCase().split(""));
      const setB = new Set(b.toLowerCase().split(""));
      const intersection = [...setA].filter(x => setB.has(x)).length;
      const union = new Set([...setA, ...setB]).size;
      return union === 0 ? 0 : intersection / union;
    };
    expect(jaccard("openai", "openai")).toBe(1);
    expect(jaccard("openai", "anthropic")).toBeLessThanOrEqual(0.5);
    expect(jaccard("deepseek", "deepseek-api")).toBeGreaterThan(0.5);
  });
});

describe("technical-fingerprint — 格式检测逻辑", () => {
  it("OpenAI 格式: { data: [{ id: ... }] }", () => {
    const detectFormat = (obj: unknown): string => {
      if (typeof obj !== "object" || obj === null) return "unknown";
      const o = obj as Record<string, unknown>;
      if (Array.isArray(o.data)) return "openai";
      if (Array.isArray(o.models)) return "anthropic";
      return "unknown";
    };
    expect(detectFormat({ data: [{ id: "gpt-4" }] })).toBe("openai");
    expect(detectFormat({ models: [{ id: "claude-3" }] })).toBe("anthropic");
    expect(detectFormat({ foo: "bar" })).toBe("unknown");
  });
});

describe("pricing-extraction — SSRF 守卫接线（S2）", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("元数据 IP baseUrl：入口拦截，返回 []，不触达 fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const results = await extractPricing("cand-1", undefined, "http://169.254.169.254/");
    expect(results).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("回环 IP baseUrl：入口拦截，返回 []，不触达 fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const results = await extractPricing("cand-2", "127.0.0.1", undefined);
    expect(results).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("公网 IP baseUrl：守卫放行，6 个出站尝试经 stub fetch（无 prisma 写入）", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("not found", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    const results = await extractPricing("cand-3", undefined, "http://93.184.216.34");
    expect(results).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(6);
    // 每次出站均携带 secure dispatcher（连接时/重定向兜底）
    for (const call of fetchMock.mock.calls) {
      const init = call[1] as RequestInit & { dispatcher?: unknown };
      expect(init).toBeTruthy();
      expect(init.dispatcher).toBeDefined();
    }
  });
});
