/**
 * user 路由直调单测（Task A.2.2；≥4 用例）。
 *
 * 策略：内存 Request 直调 withApi 包装后的 handler；vi.mock next/headers（Cookie）
 * 与 lib/db/prisma（hoisted 共享状态，事务回调注入同源 delegate 便于 spy）；
 * 断言统一信封 code/message/data 与整组覆盖 UPSERT 的调用形态。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.JWT_SECRET = process.env.JWT_SECRET ?? "unit-test-secret-aidean";

const cookieStore = new Map<string, string>();

const prismaState = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  priority: { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
  mapping: { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
  freeQuota: { findMany: vi.fn() },
  quotaUsage: { findUnique: vi.fn() },
  transaction: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

vi.mock("../../../db/prisma", () => ({
  prisma: {
    user: prismaState.user,
    userModelPriority: prismaState.priority,
    userTierMapping: prismaState.mapping,
    userFreeQuota: prismaState.freeQuota,
    userQuotaUsage: prismaState.quotaUsage,
    $transaction: prismaState.transaction,
  },
}));

import { cookies } from "next/headers";

import { COOKIE_ACCESS } from "../../auth/constants";
import { signAccess } from "../../auth/tokens";
// 被测路由（vitest include 仅 lib/**，故经相对路径直调 route handler）
const prioritiesRoute = await import("../../../../app/api/v1/user/priorities/route");
const tierMappingsRoute = await import("../../../../app/api/v1/user/tier-mappings/route");
const quotaUsageRoute = await import("../../../../app/api/v1/user/quota-usage/route");

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

function putRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  cookieStore.clear();
  // #20: requireUserApi 回库校验 — 默认 ACTIVE 用户，个别用例按需覆写
  prismaState.user.findUnique.mockResolvedValue({ status: "ACTIVE", deletedAt: null });
});

describe("user routes", () => {
  it("① 未登录 PUT priorities → HTTP 401 + 信封 code=10004 / data=null", async () => {
    mockCookieStore(); // 无 aidean_token
    const res = await prioritiesRoute.PUT(
      putRequest("http://localhost/api/v1/user/priorities", [])
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe(10004);
    expect(body.data).toBeNull();
    expect(body.requestId).toBeTruthy();
    expect(prismaState.transaction).not.toHaveBeenCalled();
  });

  it("② priority=0 业务非法（safeParse 失败）→ HTTP 400 信封 code=40000 / data=null", async () => {
    cookieStore.set(COOKIE_ACCESS, await signAccess({ id: "u-pri", tier: "NORMAL", tokenVersion: 0 }));
    mockCookieStore();
    const res = await prioritiesRoute.PUT(
      putRequest("http://localhost/api/v1/user/priorities", [
        { modelId: "m-1", priority: 0 }, // 0 与 ≥100 非法
        { modelId: "m-2", priority: 100 },
      ])
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe(40000);
    expect(body.message).toBe("优先级配置格式非法");
    expect(body.data).toBeNull();
    // 校验失败不得触库
    expect(prismaState.transaction).not.toHaveBeenCalled();
    expect(prismaState.priority.deleteMany).not.toHaveBeenCalled();
  });

  it("③ 合法整组 PUT → spy 断言事务内 deleteMany 恰一次且 createMany 映射入参，saved=n", async () => {
    cookieStore.set(COOKIE_ACCESS, await signAccess({ id: "u-pri", tier: "NORMAL", tokenVersion: 0 }));
    mockCookieStore();
    prismaState.transaction.mockImplementationOnce(
      async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({ userModelPriority: prismaState.priority })
    );
    prismaState.priority.createMany.mockResolvedValueOnce({ count: 2 });

    const res = await prioritiesRoute.PUT(
      putRequest("http://localhost/api/v1/user/priorities", [
        { modelId: "m-1", priority: 10 },
        { modelId: "m-2", priority: 99 },
      ])
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data).toEqual({ saved: 2 });
    // 整组覆盖语义：deleteMany({userId}) 在事务内被调恰一次
    expect(prismaState.transaction).toHaveBeenCalledTimes(1);
    expect(prismaState.priority.deleteMany).toHaveBeenCalledTimes(1);
    expect(prismaState.priority.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u-pri" },
    });
    expect(prismaState.priority.createMany).toHaveBeenCalledTimes(1);
    expect(prismaState.priority.createMany).toHaveBeenCalledWith({
      data: [
        { userId: "u-pri", modelId: "m-1", priority: 10 },
        { userId: "u-pri", modelId: "m-2", priority: 99 },
      ],
    });
  });

  it("④ tier-mappings 同一 modelId 绑两个档 → 40000 message 含『多个等级』", async () => {
    cookieStore.set(COOKIE_ACCESS, await signAccess({ id: "u-map", tier: "NORMAL", tokenVersion: 0 }));
    mockCookieStore();
    const res = await tierMappingsRoute.PUT(
      putRequest("http://localhost/api/v1/user/tier-mappings", [
        { tier: "OPUS", modelId: "m-9" },
        { tier: "SONNET", modelId: "m-9" },
      ])
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe(40000);
    expect(body.message).toContain("多个等级");
    expect(body.data).toBeNull();
    // 业务守卫先于事务：不落库
    expect(prismaState.transaction).not.toHaveBeenCalled();
  });

  it("⑤ GET quota-usage 已登录 → 200 信封回 quotas 数组（join 展示名，usedTokens 实况）", async () => {
    prismaState.user.findUnique.mockResolvedValueOnce({ status: "ACTIVE", deletedAt: null });
    prismaState.user.findUnique.mockResolvedValueOnce({ tier: "MAX" });
    prismaState.freeQuota.findMany.mockResolvedValueOnce([
      {
        modelId: "m-f",
        quotaTokens: 50000,
        refreshCycle: "WEEK",
        model: { nameDisplay: "GPT-4o mini" },
      },
    ]);
    prismaState.quotaUsage.findUnique.mockResolvedValueOnce({ used: 6789 });
    cookieStore.set(COOKIE_ACCESS, await signAccess({ id: "u-q", tier: "MAX", tokenVersion: 0 }));
    mockCookieStore();

    const res = await quotaUsageRoute.GET(new Request("http://localhost/api/v1/user/quota-usage"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.quotas).toHaveLength(1);
    expect(body.data.quotas[0]).toMatchObject({
      modelId: "m-f",
      modelName: "GPT-4o mini",
      totalQuotaTokens: 50000,
      usedTokens: 6789,
      resetCycle: "WEEK",
    });
    expect(new Date(body.data.quotas[0].nextResetAt).getTime()).toBeGreaterThan(Date.now());
  });
});
