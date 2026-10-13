/**
 * 官方平台目录 → 自有 Key 录入闭环单测（N3 丁：catalog:* 解析）。
 *
 * 覆盖「用户从控制台选择 catalog:openai 等官方平台目录项，POST /user/station-keys 后
 * station_user_keys 落库的是 api_stations 真实 UUID」，并验证：
 *  - 已入库（baseUrl 命中）→ 直接复用真实站点 id，不新建；
 *  - 未入库 → 按目录 baseUrl 兜底建站 + UPSTREAM 计费规则；
 *  - 未知 code → 40000（不静默造站）；
 *  - 非 catalog: 前缀的普通 UUID 直接落库（不经过目录解析）。
 *
 * 策略：内存 Request 直调 withApi 包装 handler；vi.mock next/headers、lib/db/prisma；
 * apikey 域 service 走真实实现（含 catalog 解析）。cookie mock 必须 async（生产 getSession
 * 使用 await cookies()，Next.js 15 中 cookies() 返回 Promise）。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("JWT_SECRET", "unit-test-secret-aidean");

const cookieStore = new Map<string, string>();
const state = vi.hoisted(() => ({
  stationKeyRows: [] as Array<Record<string, unknown>>,
  billingRuleUpserts: [] as Array<{ stationId: string; billingMode: string }>,
  apiStationRows: [
    // 已入库的 OpenAI 官方站（seedOfficialPlatforms 落库产物）
    {
      id: "st-openai-real",
      name: "OpenAI",
      nameCn: "OpenAI",
      displayName: "OpenAI",
      description: "d",
      provider: "OpenAI",
      website: "https://openai.com",
      baseUrl: "https://api.openai.com/v1",
      models: ["gpt-4o"],
      icon: "/brands/openai.svg",
      protocols: ["OPENAI"],
      isVerified: true,
      deletedAt: null,
    },
  ] as Array<Record<string, unknown>>,
}));

vi.mock("next/headers", () => ({ cookies: vi.fn() }));

vi.mock("../../../db/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async () => ({ status: "ACTIVE", deletedAt: null })),
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
            const merged = { ...state.stationKeyRows[idx], ...args.update };
            state.stationKeyRows[idx] = merged;
            return merged;
          }
          const row = {
            id: `suk-${state.stationKeyRows.length + 1}`,
            isActive: true,
            createdAt: new Date(),
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
    },
    aPIStation: {
      findFirst: vi.fn(
        async (args: { where: { baseUrl?: string; deletedAt?: null } }) =>
          state.apiStationRows.find((r) => r.baseUrl === args.where.baseUrl) ?? null
      ),
      create: vi.fn(async (args: { data: Record<string, unknown> }) => {
        const row = {
          id: `st-${state.apiStationRows.length + 1}`,
          ...args.data,
          deletedAt: null,
        };
        state.apiStationRows.push(row);
        return row;
      }),
    },
    stationBillingRule: {
      upsert: vi.fn(async (args: { create: { stationId: string; billingMode: string } }) => {
        state.billingRuleUpserts.push({
          stationId: args.create.stationId,
          billingMode: args.create.billingMode,
        });
        return args.create;
      }),
    },
  },
}));

import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

import { COOKIE_ACCESS } from "../../auth/constants";
import { signAccess } from "../../auth/tokens";
import { POST } from "../../../../app/api/v1/user/station-keys/route";

/** 构造带登录 cookie 的 Request（cookie mock 必须 async，见文件头注释） */
async function makeReq(body: unknown): Promise<NextRequest> {
  cookieStore.set(
    COOKIE_ACCESS,
    await signAccess({ id: "u-rw2", tier: "NORMAL", tokenVersion: 0 })
  );
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) =>
      cookieStore.has(name) ? { value: cookieStore.get(name) as string, name } : undefined,
    getAll: () => [...cookieStore.entries()].map(([name, value]) => ({ name, value })),
    has: (name: string) => cookieStore.has(name),
    set: (name: string, value: string) => void cookieStore.set(name, value),
    delete: (name: string) => void cookieStore.delete(name),
  } as unknown as Awaited<ReturnType<typeof cookies>>);
  return new Request("http://localhost/api/v1/user/station-keys", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `${COOKIE_ACCESS}=${cookieStore.get(COOKIE_ACCESS)}`,
    },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

beforeEach(() => {
  cookieStore.clear();
  state.stationKeyRows = [];
  state.billingRuleUpserts = [];
  state.apiStationRows = [
    {
      id: "st-openai-real",
      name: "OpenAI",
      nameCn: "OpenAI",
      displayName: "OpenAI",
      description: "d",
      provider: "OpenAI",
      website: "https://openai.com",
      baseUrl: "https://api.openai.com/v1",
      models: ["gpt-4o"],
      icon: "/brands/openai.svg",
      protocols: ["OPENAI"],
      isVerified: true,
      deletedAt: null,
    },
  ];
});

describe("官方平台目录 → 自有 Key 录入闭环", () => {
  it("已入库的 catalog:openai 解析为真实站点 id（复用 baseUrl 命中站）", async () => {
    const res = await POST(await makeReq({ stationId: "catalog:openai", apiKey: "sk-test-key-1234567890" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(state.stationKeyRows[0].stationId).toBe("st-openai-real");
    // 不新建站点、不重复 upsert 计费规则
    expect(state.apiStationRows.length).toBe(1);
    expect(state.billingRuleUpserts.length).toBe(0);
  });

  it("未入库的 catalog:qwen 兜底建站并写 UPSTREAM 计费规则", async () => {
    const res = await POST(await makeReq({ stationId: "catalog:qwen", apiKey: "sk-qwen-1234567890" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    // 新站按目录 baseUrl 创建，id 为真实 UUID 形（非 catalog: 前缀）
    const newStation = state.apiStationRows.find(
      (r) => r.baseUrl === "https://dashscope.aliyuncs.com/compatible-mode/v1"
    );
    expect(newStation).toBeDefined();
    expect(newStation?.id).toMatch(/^st-\d+$/);
    expect(state.stationKeyRows[0].stationId).toBe(newStation?.id);
    expect(state.billingRuleUpserts[0]).toEqual({
      stationId: newStation?.id,
      billingMode: "UPSTREAM",
    });
  });

  it("未知 code → 40000 且不落任何行", async () => {
    const res = await POST(
      await makeReq({ stationId: "catalog:not-a-platform", apiKey: "sk-x-1234567890" })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe(40000);
    expect(state.stationKeyRows.length).toBe(0);
    expect(state.apiStationRows.length).toBe(1);
  });

  it("非 catalog: 前缀的普通 UUID 直接落库（不经过目录解析）", async () => {
    const res = await POST(
      await makeReq({ stationId: "st-plain-uuid", apiKey: "sk-plain-1234567890" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(state.stationKeyRows[0].stationId).toBe("st-plain-uuid");
  });
});