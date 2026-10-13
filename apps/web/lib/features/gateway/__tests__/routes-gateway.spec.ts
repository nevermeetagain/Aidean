/**
 * gateway 路由直调单测（Task G.4.1；验收：未登录 10004 / Zod 40000 / 掩码不回显 / chat 直通响应）。
 *
 * 策略：内存 Request 直调 withApi 包装后的 handler；vi.mock next/headers（Cookie）、
 * lib/db/prisma、gateway/repository（service 依赖）与 service.gatewayOrchestrator（chat 编排）；
 * custom-channels/usage 走真实 service（repository mock），覆盖 toChannelView 掩码与 toUsageView 视图转换。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.JWT_SECRET = process.env.JWT_SECRET ?? "unit-test-secret-aidean";

const cookieStore = new Map<string, string>();

const prismaState = vi.hoisted(() => ({
  usageLog: { findUnique: vi.fn(), upsert: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  apiKeyRows: [] as Array<Record<string, unknown>>,
}));

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

// GW-KEY-01：apiKey 内存行（chat 首守卫走真实 guard：createApiKey 签发 → findUnique verify）
vi.mock("../../../db/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn().mockResolvedValue({ status: "ACTIVE", deletedAt: null }) },
    usageLog: prismaState.usageLog,
    apiKey: {
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        const row = {
          id: `key-${prismaState.apiKeyRows.length + 1}`,
          lastUsedAt: null,
          expiresAt: null,
          isActive: true,
          createdAt: new Date("2026-09-15T00:00:00Z"),
          ...args.data,
        };
        prismaState.apiKeyRows.push(row);
        return row;
      }),
      findUnique: vi.fn(async (args: { where: { keyId: string } }) =>
        prismaState.apiKeyRows.find((r) => r.keyId === args.where.keyId) ?? null
      ),
      update: vi.fn(async () => ({})),
      updateMany: vi.fn(async (args: { where: { id: string; userId: string } }) => {
        const row = prismaState.apiKeyRows.find((r) => r.id === args.where.id && r.userId === args.where.userId);
        if (!row) return { count: 0 };
        (row as { isActive: boolean }).isActive = false;
        return { count: 1 };
      }),
    },
  },
}));

// GW-KEY-01：限流窗口默认放行（429 用例单测内覆写）
vi.mock("../../../rate-limit", () => ({
  checkFixedWindow: vi.fn(async () => ({ allowed: true, count: 1 })),
}));

vi.mock("../repository", () => ({
  gatewayRepository: {
    getUsageLogByRequestId: vi.fn(async () => null),
    listCustomChannels: vi.fn(async () => []),
    findCustomChannel: vi.fn(async () => null),
    upsertCustomChannel: vi.fn(),
    deleteCustomChannel: vi.fn(async () => 0),
    listUsageLogs: vi.fn(),
    loadRouteConfig: vi.fn(),
    findModelByCode: vi.fn(),
    findModelsByIds: vi.fn(),
    getQuotaUsed: vi.fn(),
    addQuotaUsed: vi.fn(),
    getBillingRule: vi.fn(),
    listAvailableKeys: vi.fn(),
    markKeyFailure: vi.fn(),
    markKeySuccess: vi.fn(),
    listCallableStations: vi.fn(async () => []),
    insertUsageLog: vi.fn(),
    getAccountTier: vi.fn(),
  },
}));

// chat 路由编排 mock（保留 service 其余真实导出：toChannelView/toUsageView 掩码与视图转换走真实实现）
vi.mock("../service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../service")>();
  return {
    ...actual,
    gatewayOrchestrator: {
      executeChat: vi.fn(async () => ({
        response: { id: "resp-1", object: "chat.completion", choices: [] },
        meta: {
          requestId: "req-e2e-1",
          modelId: "m-1",
          stationId: "s-1",
          channelId: null,
          billingPath: "PLATFORM",
          promptTokens: 10,
          completionTokens: 5,
          quotaMinor: 150n,
          latencyMs: 42,
          statusCode: 200,
        },
      })),
    },
  };
});

import { cookies } from "next/headers";

import { COOKIE_ACCESS } from "../../auth/constants";
import { signAccess } from "../../auth/tokens";
import { gatewayOrchestrator } from "../service";
// 被测路由（vitest include 仅 lib/**，故经相对路径直调 route handler）
const chatRoute = await import("../../../../app/api/v1/gateway/chat/route");
const channelsRoute = await import("../../../../app/api/v1/user/custom-channels/route");
const channelIdRoute = await import("../../../../app/api/v1/user/custom-channels/[id]/route");
const usageRoute = await import("../../../../app/api/v1/user/usage/route");
const { gatewayRepository } = (await import("../repository")) as unknown as {
  gatewayRepository: Record<string, ReturnType<typeof vi.fn>>;
};

function mockCookieStore() {
  const store = cookieStore;
  vi.mocked(cookies).mockReturnValue({
    get: (name: string) =>
      store.has(name) ? { value: store.get(name) as string, name } : undefined,
    getAll: () => [...store.entries()].map(([name, value]) => ({ name, value })),
    has: (name: string) => store.has(name),
    set: (name: string, value: string) => void store.set(name, value),
    delete: (name: string) => void store.delete(name),
  } as unknown as ReturnType<typeof cookies>);
}

function request(url: string, init?: RequestInit): Request {
  return new Request(url, init);
}

beforeEach(() => {
  vi.clearAllMocks();
  cookieStore.clear();
});

describe("gateway routes", () => {
  it("① 未登录 POST gateway/chat → HTTP 401 + 信封 code=10004", async () => {
    mockCookieStore(); // 无 aidean_token
    const res = await chatRoute.POST(
      request("http://localhost/api/v1/gateway/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: "gpt-x", messages: [{ role: "user", content: "hi" }] }),
      })
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe(10004);
    expect(body.data).toBeNull();
  });

  it("② 登录后 chat body 非法（缺 messages）→ 40000 且编排未触达", async () => {
    cookieStore.set(COOKIE_ACCESS, await signAccess({ id: "u-gw", tier: "NORMAL", tokenVersion: 0 }));
    mockCookieStore();
    const res = await chatRoute.POST(
      request("http://localhost/api/v1/gateway/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: "gpt-x" }),
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe(40000);
    expect(gatewayOrchestrator.executeChat).not.toHaveBeenCalled();
  });

  it("③ chat 成功 → 直通响应（无信封）+ 计费事实头部 + x-request-id 透传", async () => {
    cookieStore.set(COOKIE_ACCESS, await signAccess({ id: "u-gw", tier: "NORMAL", tokenVersion: 0 }));
    mockCookieStore();
    const res = await chatRoute.POST(
      request("http://localhost/api/v1/gateway/chat", {
        method: "POST",
        headers: { "content-type": "application/json", "x-request-id": "req-e2e-1" },
        body: JSON.stringify({
          model: "claude-3-7-sonnet",
          messages: [{ role: "user", content: "hi" }],
          max_tokens: 64,
        }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ id: "resp-1", object: "chat.completion", choices: [] });
    expect(res.headers.get("x-aidean-billing-path")).toBe("PLATFORM");
    expect(res.headers.get("x-request-id")).toBe("req-e2e-1");
    expect(res.headers.get("x-aidean-quota-minor")).toBe("150");
    const [userId, parsedBody, requestId] = vi.mocked(gatewayOrchestrator.executeChat).mock.calls[0];
    expect(userId).toBe("u-gw");
    expect(parsedBody).toMatchObject({ model: "claude-3-7-sonnet", max_tokens: 64 });
    expect(requestId).toBe("req-e2e-1");
  });

  it("④ 未登录 GET custom-channels → 401/10004", async () => {
    mockCookieStore();
    const res = await channelsRoute.GET(request("http://localhost/api/v1/user/custom-channels"));
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe(10004);
  });

  it("⑤ GET custom-channels → apiKey 恒掩码不回显明文", async () => {
    cookieStore.set(COOKIE_ACCESS, await signAccess({ id: "u-gw", tier: "NORMAL", tokenVersion: 0 }));
    mockCookieStore();
    gatewayRepository.listCustomChannels.mockResolvedValue([
      {
        id: "ch-1",
        name: "我的中转",
        baseUrl: "https://relay.example.com",
        format: "OPENAI",
        isActive: true,
        keyMasked: "sk-****7890",
        createdAt: new Date("2026-08-28T00:00:00Z"),
      },
    ]);
    const res = await channelsRoute.GET(request("http://localhost/api/v1/user/custom-channels"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0]).toMatchObject({
      id: "ch-1",
      apiKeyMasked: "sk-****7890",
      format: "openai",
    });
    expect(JSON.stringify(body)).not.toContain("sk-plain-1234567890");
  });

  it("⑥ POST custom-channels apiKey 过短（<8）→ 40000 且不触库", async () => {
    cookieStore.set(COOKIE_ACCESS, await signAccess({ id: "u-gw", tier: "NORMAL", tokenVersion: 0 }));
    mockCookieStore();
    const res = await channelsRoute.POST(
      request("http://localhost/api/v1/user/custom-channels", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "x", baseUrl: "https://a.b/c", apiKey: "short" }),
      })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe(40000);
    expect(gatewayRepository.upsertCustomChannel).not.toHaveBeenCalled();
  });

  it("⑥b POST custom-channels 合法 → keyCipher/keyMasked 落库 + 响应永不含明文/密文（T3 安全债收口）", async () => {
    cookieStore.set(COOKIE_ACCESS, await signAccess({ id: "u-gw", tier: "NORMAL", tokenVersion: 0 }));
    mockCookieStore();
    const plainKey = "sk-test-1234567890abcdef";
    gatewayRepository.upsertCustomChannel.mockResolvedValue({
      id: "ch-t3",
      name: "T3渠道",
      baseUrl: "https://relay.example.com",
      format: "OPENAI",
      isActive: true,
      keyCipher: "v1:dummy-iv:dummy-tag:dummy-ct",
      keyMasked: "sk-****cdef",
      createdAt: new Date("2026-09-16T00:00:00Z"),
    });
    const res = await channelsRoute.POST(
      request("http://localhost/api/v1/user/custom-channels", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "T3渠道", baseUrl: "https://relay.example.com", apiKey: plainKey, format: "openai" }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    // 响应不含明文 apiKey
    expect(JSON.stringify(body)).not.toContain(plainKey);
    // 响应不含密文列名与密文值
    expect(JSON.stringify(body)).not.toContain("keyCipher");
    expect(JSON.stringify(body)).not.toContain("v1:");
    // 掩码视图
    expect(body.data.apiKeyMasked).toBe("sk-****cdef");
    // repository 收到加密后的 keyCipher（v1: 前缀）与 keyMasked
    const callArg = gatewayRepository.upsertCustomChannel.mock.calls.at(-1)?.[2];
    expect(callArg?.keyCipher).toMatch(/^v1:/);
    expect(callArg?.keyMasked).toBeTruthy();
  });

  it("⑥c GET custom-channels 多行 → 均读 keyMasked 不回显明文/密文", async () => {
    cookieStore.set(COOKIE_ACCESS, await signAccess({ id: "u-gw", tier: "NORMAL", tokenVersion: 0 }));
    mockCookieStore();
    gatewayRepository.listCustomChannels.mockResolvedValue([
      {
        id: "ch-1",
        name: "渠道A",
        baseUrl: "https://a.example",
        format: "OPENAI",
        isActive: true,
        keyMasked: "sk-****7890",
        createdAt: new Date("2026-09-16T00:00:00Z"),
      },
      {
        id: "ch-2",
        name: "渠道B",
        baseUrl: "https://b.example",
        format: "ANTHROPIC",
        isActive: true,
        keyMasked: "ak-****xyz0",
        createdAt: new Date("2026-08-28T00:00:00Z"),
      },
    ]);
    const res = await channelsRoute.GET(request("http://localhost/api/v1/user/custom-channels"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.items).toHaveLength(2);
    expect(body.data.items[0]).toMatchObject({ id: "ch-1", apiKeyMasked: "sk-****7890" });
    expect(body.data.items[1]).toMatchObject({ id: "ch-2", apiKeyMasked: "ak-****xyz0" });
    expect(JSON.stringify(body)).not.toContain("keyCipher");
    expect(JSON.stringify(body)).not.toContain("v1:");
  });

  it("⑦ DELETE 不存在/非本人渠道 → 40000（deleteMany 0 行）", async () => {
    cookieStore.set(COOKIE_ACCESS, await signAccess({ id: "u-gw", tier: "NORMAL", tokenVersion: 0 }));
    mockCookieStore();
    gatewayRepository.deleteCustomChannel.mockResolvedValue(0);
    const res = await channelIdRoute.DELETE(request("http://localhost/api/v1/user/custom-channels/none"), {
      params: Promise.resolve({ id: "none" }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe(40000);
  });

  it("⑧ 未登录 GET usage → 401/10004", async () => {
    mockCookieStore();
    const res = await usageRoute.GET(request("http://localhost/api/v1/user/usage?page=1"));
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe(10004);
  });

  it("⑨ GET usage 非法分页（page=0）→ 40000 且不触库", async () => {
    cookieStore.set(COOKIE_ACCESS, await signAccess({ id: "u-gw", tier: "NORMAL", tokenVersion: 0 }));
    mockCookieStore();
    const res = await usageRoute.GET(request("http://localhost/api/v1/user/usage?page=0"));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe(40000);
    expect(gatewayRepository.listUsageLogs).not.toHaveBeenCalled();
  });

  it("⑩ GET usage 合法 → 分页视图（quotaMinor 150 分 → quotaYuan '1.50'）", async () => {
    cookieStore.set(COOKIE_ACCESS, await signAccess({ id: "u-gw", tier: "NORMAL", tokenVersion: 0 }));
    mockCookieStore();
    gatewayRepository.listUsageLogs.mockResolvedValue({
      rows: [
        {
          id: "ul-1",
          model: "claude-3-7-sonnet",
          station: { name: "网关E2E Mock站", displayName: "网关E2E Mock站" },
          promptTokens: 10,
          completionTokens: 5,
          quotaMinor: 150n,
          billingPath: "PLATFORM",
          latencyMs: 42,
          statusCode: 200,
          createdAt: new Date("2026-08-28T00:00:00Z"),
        },
      ],
      total: 1,
    });
    const res = await usageRoute.GET(request("http://localhost/api/v1/user/usage?page=1&pageSize=20"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({ total: 1, page: 1, pageSize: 20 });
    expect(body.data.items[0]).toMatchObject({
      id: "ul-1",
      stationName: "网关E2E Mock站",
      quotaYuan: "1.50",
      billingPath: "PLATFORM",
    });
  });

  // ==================== GW-KEY-01 P2：平台 API Key 双通道（Bearer / x-api-key） ====================

  it("⑪ Bearer 平台 API Key → 200 免 cookie；userId 取 Key 归属；计费事实头不变", async () => {
    const { createApiKey } = await import("../../apikey/service");
    const { plaintext } = await createApiKey("u-key-1", { name: "ci", permissions: ["gateway:chat"] });
    const res = await chatRoute.POST(
      request("http://localhost/api/v1/gateway/chat", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${plaintext}` },
        body: JSON.stringify({ model: "claude-3-7-sonnet", messages: [{ role: "user", content: "hi" }], max_tokens: 64 }),
      })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("x-aidean-billing-path")).toBe("PLATFORM");
    const [userId] = vi.mocked(gatewayOrchestrator.executeChat).mock.calls[0];
    expect(userId).toBe("u-key-1");
  });

  it("⑫ x-api-key（Anthropic 形态）→ 200 同通道", async () => {
    const { createApiKey } = await import("../../apikey/service");
    const { plaintext } = await createApiKey("u-key-2", { name: "claude-cli", permissions: ["gateway:chat"] });
    const res = await chatRoute.POST(
      request("http://localhost/api/v1/gateway/chat", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": plaintext },
        body: JSON.stringify({ model: "claude-3-7-sonnet", messages: [{ role: "user", content: "hi" }], max_tokens: 64 }),
      })
    );
    expect(res.status).toBe(200);
  });

  it("⑬ 伪造 Key → 401/10004 且编排未触达", async () => {
    const res = await chatRoute.POST(
      request("http://localhost/api/v1/gateway/chat", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer aid_ak_deadbeefdeadbeef_AAAAfakeSecretValue" },
        body: JSON.stringify({ model: "claude-3-7-sonnet", messages: [{ role: "user", content: "hi" }], max_tokens: 64 }),
      })
    );
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe(10004);
    expect(gatewayOrchestrator.executeChat).not.toHaveBeenCalled();
  });

  it("⑭ 吊销 Key → 401/10004 即时生效", async () => {
    const { createApiKey, revokeApiKey } = await import("../../apikey/service");
    const { plaintext, view } = await createApiKey("u-key-3", { name: "t", permissions: ["gateway:chat"] });
    await revokeApiKey("u-key-3", view.id);
    const res = await chatRoute.POST(
      request("http://localhost/api/v1/gateway/chat", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${plaintext}` },
        body: JSON.stringify({ model: "claude-3-7-sonnet", messages: [{ role: "user", content: "hi" }], max_tokens: 64 }),
      })
    );
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe(10004);
  });

  it("⑮ 无 gateway:chat 权限 → 403/10008", async () => {
    const { createApiKey } = await import("../../apikey/service");
    const { plaintext } = await createApiKey("u-key-4", { name: "t", permissions: ["other:perm"] });
    const res = await chatRoute.POST(
      request("http://localhost/api/v1/gateway/chat", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${plaintext}` },
        body: JSON.stringify({ model: "claude-3-7-sonnet", messages: [{ role: "user", content: "hi" }], max_tokens: 64 }),
      })
    );
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe(10008);
  });

  it("⑯ Key 超限 → 429/10006（提示语含重试语义）", async () => {
    const { createApiKey } = await import("../../apikey/service");
    const { plaintext } = await createApiKey("u-key-5", { name: "t", permissions: ["gateway:chat"] });
    const { checkFixedWindow } = await import("../../../rate-limit");
    vi.mocked(checkFixedWindow).mockResolvedValueOnce({ allowed: false, count: 61 });
    const res = await chatRoute.POST(
      request("http://localhost/api/v1/gateway/chat", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${plaintext}` },
        body: JSON.stringify({ model: "claude-3-7-sonnet", messages: [{ role: "user", content: "hi" }], max_tokens: 64 }),
      })
    );
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.code).toBe(10006);
    expect(body.message).toContain("重试");
  });

  // ==================== 问题 5：接入格式归一（Responses API / Gemini generateContent） ====================

  it("⑰ Responses API 接入 → 归一为 openai 调编排（instructions→system）+ 响应回写 response 体裁", async () => {
    cookieStore.set(COOKIE_ACCESS, await signAccess({ id: "u-gw", tier: "NORMAL", tokenVersion: 0 }));
    mockCookieStore();
    vi.mocked(gatewayOrchestrator.executeChat).mockResolvedValueOnce({
      response: {
        id: "cc-9",
        object: "chat.completion",
        model: "gpt-4o",
        choices: [{ message: { role: "assistant", content: "hello back" } }],
        usage: { prompt_tokens: 8, completion_tokens: 4 },
      },
      meta: { requestId: "r17", modelId: "m", stationId: null, channelId: null, billingPath: "PLATFORM", quotaMinor: 120n },
    } as never);
    const res = await chatRoute.POST(
      request("http://localhost/api/v1/gateway/chat", {
        method: "POST",
        headers: { "content-type": "application/json", "x-request-id": "r17" },
        body: JSON.stringify({ model: "gpt-4o", input: "hi", instructions: "be nice", max_output_tokens: 50 }),
      })
    );
    expect(res.status).toBe(200);
    const out = await res.json();
    expect(out.object).toBe("response");
    expect(out.output_text).toBe("hello back");
    expect(out.usage).toEqual({ input_tokens: 8, output_tokens: 4, total_tokens: 12 });
    const [, normalized] = vi.mocked(gatewayOrchestrator.executeChat).mock.calls[0];
    expect(normalized).toMatchObject({
      model: "gpt-4o",
      max_tokens: 50,
      messages: [
        { role: "system", content: "be nice" },
        { role: "user", content: "hi" },
      ],
    });
  });

  it("⑱ Gemini generateContent 接入 → 归一为 openai + 响应回写 candidates/usageMetadata 体裁", async () => {
    cookieStore.set(COOKIE_ACCESS, await signAccess({ id: "u-gw", tier: "NORMAL", tokenVersion: 0 }));
    mockCookieStore();
    vi.mocked(gatewayOrchestrator.executeChat).mockResolvedValueOnce({
      response: {
        id: "c",
        object: "chat.completion",
        model: "gemini-2.0-flash",
        choices: [{ message: { role: "assistant", content: "yo" } }],
        usage: { prompt_tokens: 3, completion_tokens: 5 },
      },
      meta: { requestId: "r18", modelId: "m", stationId: null, channelId: null, billingPath: "PLATFORM", quotaMinor: 10n },
    } as never);
    const res = await chatRoute.POST(
      request("http://localhost/api/v1/gateway/chat", {
        method: "POST",
        headers: { "content-type": "application/json", "x-request-id": "r18" },
        body: JSON.stringify({
          model: "gemini-2.0-flash",
          contents: [{ role: "user", parts: [{ text: "hi" }] }],
          generationConfig: { maxOutputTokens: 64, temperature: 0.2 },
        }),
      })
    );
    expect(res.status).toBe(200);
    const out = await res.json();
    expect(out.candidates[0].content.parts[0].text).toBe("yo");
    expect(out.usageMetadata).toMatchObject({ promptTokenCount: 3, candidatesTokenCount: 5, totalTokenCount: 8 });
    const [, normalized] = vi.mocked(gatewayOrchestrator.executeChat).mock.calls[0];
    expect(normalized).toMatchObject({
      model: "gemini-2.0-flash",
      max_tokens: 64,
      messages: [{ role: "user", content: "hi" }],
    });
  });
});
