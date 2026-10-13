/**
 * apikey 路由直调单测（RW-2 P2：堵 GW-KEY-01「路由层无测试」盲区）。
 *
 * 覆盖 3 路由 6 操作的 HTTP 层：匿名 401 / 签发明文仅一次 / 列表脱敏（无明文无哈希）/
 * 非法参 40000 / DELETE 本人与 0 行 / station-keys 录入-覆盖-upsert-删除-脱敏。
 *
 * 策略：内存 Request 直调 withApi 包装 handler；vi.mock next/headers（Cookie）、
 * lib/db/prisma（apiKey + stationUserKey 内存行）、lib/rate-limit（窗口放行）；
 * **apikey 域 service 走真实实现**（签发/哈希/加密/校验全真链路）。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("JWT_SECRET", "unit-test-secret-aidean");

const cookieStore = new Map<string, string>();
const state = vi.hoisted(() => ({
  apiKeyRows: [] as Array<Record<string, unknown>>,
  stationKeyRows: [] as Array<Record<string, unknown>>,
}));

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

vi.mock("../../../db/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn().mockResolvedValue({ status: "ACTIVE", deletedAt: null }) },
    apiKey: {
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        const row = {
          id: `key-${state.apiKeyRows.length + 1}`,
          lastUsedAt: null,
          expiresAt: null,
          isActive: true,
          createdAt: new Date("2026-09-15T00:00:00Z"),
          ...args.data,
        };
        state.apiKeyRows.push(row);
        return row;
      }),
      findUnique: vi.fn(async (args: { where: { keyId: string } }) =>
        state.apiKeyRows.find((r) => r.keyId === args.where.keyId) ?? null
      ),
      findMany: vi.fn(async () => state.apiKeyRows),
      update: vi.fn(async () => ({})),
      updateMany: vi.fn(async (args: { where: { id: string; userId: string } }) => {
        const row = state.apiKeyRows.find((r) => r.id === args.where.id && r.userId === args.where.userId);
        if (!row) return { count: 0 };
        (row as { isActive: boolean }).isActive = false;
        return { count: 1 };
      }),
      deleteMany: vi.fn(async (args: { where: { id: string; userId: string } }) => {
        const before = state.apiKeyRows.length;
        state.apiKeyRows = state.apiKeyRows.filter(
          (r) => !(r.id === args.where.id && r.userId === args.where.userId)
        );
        return { count: before - state.apiKeyRows.length };
      }),
    },
    stationUserKey: {
      upsert: vi.fn(
        async (args: {
          where: { userId_stationId: { userId: string; stationId: string } };
          create: Record<string, unknown>;
          update: Record<string, unknown>;
        }) => {
          const { userId, stationId } = args.where.userId_stationId;
          const idx = state.stationKeyRows.findIndex(
            (r) => r.userId === userId && r.stationId === stationId
          );
          if (idx >= 0) {
            const merged = { ...state.stationKeyRows[idx], ...args.update, updatedAt: new Date("2026-09-15T00:01:00Z") };
            state.stationKeyRows[idx] = merged;
            return merged;
          }
          const row = {
            id: `suk-${state.stationKeyRows.length + 1}`,
            isActive: true,
            createdAt: new Date("2026-09-15T00:00:00Z"),
            ...args.create,
          };
          state.stationKeyRows.push(row);
          return row;
        }
      ),
      findMany: vi.fn(async () => state.stationKeyRows),
      findFirst: vi.fn(
        async (args: { where: { id?: string; userId?: string; stationId?: string } }) =>
          state.stationKeyRows.find(
            (r) =>
              (args.where.id === undefined || r.id === args.where.id) &&
              (args.where.userId === undefined || r.userId === args.where.userId) &&
              (args.where.stationId === undefined || r.stationId === args.where.stationId)
          ) ?? null
      ),
      update: vi.fn(async (args: { where: { id: string }; data: Record<string, unknown> }) => {
        const idx = state.stationKeyRows.findIndex((r) => r.id === args.where.id);
        if (idx < 0) throw Object.assign(new Error("not found"), { code: "P2025" });
        state.stationKeyRows[idx] = { ...state.stationKeyRows[idx], ...args.data };
        return state.stationKeyRows[idx];
      }),
      deleteMany: vi.fn(async (args: { where: { userId?: string; stationId?: string; id?: string } }) => {
        const before = state.stationKeyRows.length;
        state.stationKeyRows = state.stationKeyRows.filter(
          (r) =>
            !(
              (args.where.userId === undefined || r.userId === args.where.userId) &&
              (args.where.stationId === undefined || r.stationId === args.where.stationId) &&
              (args.where.id === undefined || r.id === args.where.id)
            )
        );
        return { count: before - state.stationKeyRows.length };
      }),
    },
    aPIStation: {
      findMany: vi.fn(async () => [
        { id: "st-a", displayName: "站点A", baseUrl: "https://a.example.com" },
        { id: "st-b", displayName: "站点B", baseUrl: null },
      ]),
    },
  },
}));

vi.mock("../../../rate-limit", () => ({
  checkFixedWindow: vi.fn(async () => ({ allowed: true, count: 1 })),
}));

import { cookies } from "next/headers";

import { COOKIE_ACCESS } from "../../auth/constants";
import { signAccess } from "../../auth/tokens";

// 被测路由（vitest include 仅 lib/**，经相对路径直调 route handler）
const apiKeysRoute = await import("../../../../app/api/v1/user/api-keys/route");
const apiKeyIdRoute = await import("../../../../app/api/v1/user/api-keys/[id]/route");
const stationKeysRoute = await import("../../../../app/api/v1/user/station-keys/route");
const stationKeyIdRoute = await import("../../../../app/api/v1/user/station-keys/[id]/route");
const stationListRoute = await import("../../../../app/api/v1/user/station-keys/stations/route");

function mockCookieStore() {
  vi.mocked(cookies).mockReturnValue({
    get: (name: string) =>
      cookieStore.has(name) ? { value: cookieStore.get(name) as string, name } : undefined,
    getAll: () => [...cookieStore.entries()].map(([name, value]) => ({ name, value })),
    has: (name: string) => cookieStore.has(name),
    set: (name: string, value: string) => void cookieStore.set(name, value),
    delete: (name: string) => void cookieStore.delete(name),
  } as unknown as ReturnType<typeof cookies>);
}

function request(url: string, init?: RequestInit): Request {
  return new Request(url, init);
}

async function login(userId = "u-rw2") {
  cookieStore.set(COOKIE_ACCESS, await signAccess({ id: userId, tier: "NORMAL", tokenVersion: 0 }));
  mockCookieStore();
}

beforeEach(() => {
  vi.clearAllMocks();
  cookieStore.clear();
  state.apiKeyRows.length = 0;
  state.stationKeyRows.length = 0;
});

describe("apikey 路由（RW-2 P2）", () => {
  it("① GET /api-keys 匿名 → 401/10004", async () => {
    mockCookieStore();
    const res = await apiKeysRoute.GET(request("http://localhost/api/v1/user/api-keys"));
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe(10004);
  });

  it("② POST 签发 → 200；plaintext 形如 aid_ak_<16hex>_ 且全响应恰出现一次", async () => {
    await login();
    const res = await apiKeysRoute.POST(
      request("http://localhost/api/v1/user/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "ci", permissions: ["gateway:chat"] }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.plaintext).toMatch(/^aid_ak_[0-9a-f]{16}_[A-Za-z0-9_-]{43}$/);
    const s = JSON.stringify(body);
    expect(s.split(body.data.plaintext).length - 1).toBe(1); // 明文恰出现一次
    expect(body.data.item.keyId).toMatch(/^ak_[0-9a-f]{16}$/);
    expect(JSON.stringify(body)).not.toContain("keyHash");
  });

  it("③ 签发后 GET 列表脱敏：无明文、无 keyHash、含 keyId", async () => {
    await login();
    const created = await apiKeysRoute.POST(
      request("http://localhost/api/v1/user/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "ci", permissions: ["gateway:chat"] }),
      })
    );
    const plaintext = (await created.json()).data.plaintext as string;
    const res = await apiKeysRoute.GET(request("http://localhost/api/v1/user/api-keys"));
    const body = await res.json();
    const s = JSON.stringify(body);
    expect(s).not.toContain(plaintext);
    expect(s).not.toContain("keyHash");
    expect(s).toContain("ak_"); // keyId 可见（非秘密标识）
    expect(body.data.items).toHaveLength(1);
  });

  it("④ POST 非法参（rpm 超限 / 空 name / 空 permissions）→ 40000 且不触库", async () => {
    await login();
    const before = state.apiKeyRows.length;
    for (const bad of [
      { name: "t", permissions: ["gateway:chat"], rateLimit: { requestsPerMinute: 7000 } },
      { name: "", permissions: ["gateway:chat"] },
      { name: "t", permissions: [] },
    ]) {
      const res = await apiKeysRoute.POST(
        request("http://localhost/api/v1/user/api-keys", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(bad),
        })
      );
      expect(res.status).toBe(400);
      expect((await res.json()).code).toBe(40000);
    }
    expect(state.apiKeyRows.length).toBe(before);
  });

  it("⑤ DELETE 本人 Key → 200 {deleted:true}；行物理移除（Key 应删除而非吊销）", async () => {
    await login();
    const created = await apiKeysRoute.POST(
      request("http://localhost/api/v1/user/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "t", permissions: ["gateway:chat"] }),
      })
    );
    const view = (await created.json()).data.item;
    const res = await apiKeyIdRoute.DELETE(request("http://localhost/api/v1/user/api-keys/none"), {
      params: Promise.resolve({ id: view.id }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ deleted: true });
    expect(state.apiKeyRows.find((r) => r.id === view.id)).toBeUndefined();
  });

  it("⑥ DELETE 不存在/非本人 Key → 40000", async () => {
    await login();
    const res = await apiKeyIdRoute.DELETE(request("http://localhost/api/v1/user/api-keys/none"), {
      params: Promise.resolve({ id: "no-such-id" }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe(40000);
  });

  it("⑦ station-keys POST → 200；落库 keyCipher 前缀 v1:、keyMasked 存在；响应无明文无密文", async () => {
    await login();
    const res = await stationKeysRoute.POST(
      request("http://localhost/api/v1/user/station-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stationId: "st-a", apiKey: "sk-user-upstream-plain", name: "my-key" }),
      })
    );
    expect(res.status).toBe(200);
    expect(state.stationKeyRows[0].keyCipher).toMatch(/^v1:/);
    expect(String(state.stationKeyRows[0].keyMasked)).toContain("****");
    const body = await res.json();
    const s = JSON.stringify(body);
    expect(s).not.toContain("sk-user-upstream-plain");
    expect(s).not.toContain("keyCipher");
    expect(body.data.item.keyMasked).toBeTruthy();
  });

  it("⑧ station-keys GET 脱敏：JSON 无 keyCipher 无明文、含 keyMasked", async () => {
    await login();
    await stationKeysRoute.POST(
      request("http://localhost/api/v1/user/station-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stationId: "st-a", apiKey: "sk-plain-value-123" }),
      })
    );
    const res = await stationKeysRoute.GET(request("http://localhost/api/v1/user/station-keys"));
    const body = await res.json();
    const s = JSON.stringify(body);
    expect(s).not.toContain("sk-plain-value-123");
    expect(s).not.toContain("keyCipher");
    expect(s).toContain("keyMasked");
    expect(body.data.items).toHaveLength(1);
  });

  it("⑨ station-keys POST 覆盖式 upsert：同 stationId 再录行数不增（isActive 复活）", async () => {
    await login();
    const mk = () =>
      stationKeysRoute.POST(
        request("http://localhost/api/v1/user/station-keys", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ stationId: "st-a", apiKey: "sk-second-key" }),
        })
      );
    await mk();
    // 模拟已吊销后重录：isActive 复活语义在 update 分支
    (state.stationKeyRows[0] as { isActive: boolean }).isActive = false;
    await mk();
    expect(state.stationKeyRows).toHaveLength(1);
    expect(state.stationKeyRows[0].isActive).toBe(true);
    expect(state.stationKeyRows[0].keyCipher).toMatch(/^v1:/);
  });

  it("⑩ station-keys DELETE 按 stationId → 200；再 GET 为空", async () => {
    await login();
    await stationKeysRoute.POST(
      request("http://localhost/api/v1/user/station-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stationId: "st-a", apiKey: "sk-del-target" }),
      })
    );
    const res = await stationKeysRoute.DELETE(
      request("http://localhost/api/v1/user/station-keys", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stationId: "st-a" }),
      })
    );
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ deleted: true });
    const after = await stationKeysRoute.GET(request("http://localhost/api/v1/user/station-keys"));
    expect((await after.json()).data.items).toHaveLength(0);
  });

  it("⑪ station-keys DELETE 0 行（不存在）→ 40000", async () => {
    await login();
    const res = await stationKeysRoute.DELETE(
      request("http://localhost/api/v1/user/station-keys", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stationId: "no-such" }),
      })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe(40000);
  });

  it("⑫ station-keys DELETE body 缺 stationId / POST 非法参 → 40000 且不触库", async () => {
    await login();
    const delRes = await stationKeysRoute.DELETE(
      request("http://localhost/api/v1/user/station-keys", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
    );
    expect(delRes.status).toBe(400);
    expect((await delRes.json()).code).toBe(40000);
    const postRes = await stationKeysRoute.POST(
      request("http://localhost/api/v1/user/station-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stationId: "  ", apiKey: "" }),
      })
    );
    expect(postRes.status).toBe(400);
    expect(state.stationKeyRows).toHaveLength(0);
  });

  it("⑬ station-keys GET 匿名 → 401/10004", async () => {
    mockCookieStore();
    const res = await stationKeysRoute.GET(request("http://localhost/api/v1/user/station-keys"));
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe(10004);
  });

  it("⑭ station-keys/[id] PATCH 仅改名→不动密文（免重填 Key）", async () => {
    await login();
    await stationKeysRoute.POST(
      request("http://localhost/api/v1/user/station-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stationId: "st-a", apiKey: "sk-original-key-123", name: "old" }),
      })
    );
    const id = state.stationKeyRows[0].id as string;
    const cipherBefore = state.stationKeyRows[0].keyCipher;
    const res = await stationKeyIdRoute.PATCH(
      request("http://localhost/api/v1/user/station-keys/x", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "new-name" }),
      }),
      { params: Promise.resolve({ id }) }
    );
    expect(res.status).toBe(200);
    expect(state.stationKeyRows[0].name).toBe("new-name");
    expect(state.stationKeyRows[0].keyCipher).toBe(cipherBefore); // 未重加密
  });

  it("⑮ station-keys/[id] PATCH isActive + DELETE by id", async () => {
    await login();
    await stationKeysRoute.POST(
      request("http://localhost/api/v1/user/station-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stationId: "st-a", apiKey: "sk-toggle-key-9" }),
      })
    );
    const id = state.stationKeyRows[0].id as string;
    const patchRes = await stationKeyIdRoute.PATCH(
      request("http://localhost/api/v1/user/station-keys/x", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      }),
      { params: Promise.resolve({ id }) }
    );
    expect(patchRes.status).toBe(200);
    expect(state.stationKeyRows[0].isActive).toBe(false);
    const delRes = await stationKeyIdRoute.DELETE(request("http://localhost/api/v1/user/station-keys/x"), {
      params: Promise.resolve({ id }),
    });
    expect(delRes.status).toBe(200);
    expect(state.stationKeyRows).toHaveLength(0);
  });

  it("⑯ station-keys/[id] PATCH 非本人/不存在 → 40000", async () => {
    await login();
    const res = await stationKeyIdRoute.PATCH(
      request("http://localhost/api/v1/user/station-keys/x", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "x" }),
      }),
      { params: Promise.resolve({ id: "no-such" }) }
    );
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe(40000);
  });

  it("⑰ station-keys/stations GET → 返回可选 UPSTREAM 站列表", async () => {
    await login();
    const res = await stationListRoute.GET(request("http://localhost/api/v1/user/station-keys/stations"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.items.length).toBeGreaterThan(0);
    expect(body.data.items[0]).toHaveProperty("displayName");
  });
});
