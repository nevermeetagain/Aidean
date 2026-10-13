/**
 * B-N7/3.3.3：admin 写端点 zod 校验文案中文化契约。
 *
 * A. 静态守卫：11 处 POST/PATCH 写端点统一走 formatZodMessage，且不再直抛英文 issues[0]?.message
 *    （防后续新增端点回退到英文文案，属契约回归网）。
 * B. 运行时：vendors POST / vendors[id] PATCH 非法 body → 400 code=40000 + 中文文案。
 *
 * 边界：users/models GET 分页为既存硬编码中文「分页参数非法」，按立项保持不动；
 * lib/features/auth/service.ts:58 第三处格式化器非 B 独占域，仅标注不擅改。
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it, vi } from "vitest";

const guardStub = vi.hoisted(() => ({ requireAdminApi: vi.fn() }));
const prismaState = vi.hoisted(() => ({
  vendor: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
  $transaction: vi.fn(),
}));
const auditStub = vi.hoisted(() => ({ writeAudit: vi.fn() }));

vi.mock("../session", () => guardStub);
vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));
vi.mock("../../../../app/api/v1/_lib/audit", () => auditStub);

const vendorsRoute = await import("../../../../app/api/v1/admin/vendors/route");
const vendorDetailRoute = await import("../../../../app/api/v1/admin/vendors/[id]/route");

const SESSION_OK = { userId: "u-admin", tier: "PRO" };

const ADMIN_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../app/api/v1/admin"
);

/** 11 处写端点（B-N7/3.3.3 覆盖范围） */
const WRITE_ENDPOINTS = [
  "vendors/route.ts",
  "vendors/[id]/route.ts",
  "products/route.ts",
  "products/[id]/route.ts",
  "packages/route.ts",
  "packages/[id]/route.ts",
  "partner-keys/route.ts",
  "users/[id]/route.ts",
  "models/[id]/route.ts",
  "wallets/adjust/route.ts",
  "redemption-codes/batches/route.ts",
];

beforeEach(() => {
  vi.resetAllMocks();
});

describe("A. 静态契约：11 处写端点统一 formatZodMessage", () => {
  it("① 全部接入 formatZodMessage 且无英文直抛残留", () => {
    for (const rel of WRITE_ENDPOINTS) {
      const src = readFileSync(path.join(ADMIN_ROOT, rel), "utf8");
      expect(src, `${rel} 未接入 formatZodMessage`).toContain(
        "formatZodMessage(parsed.error.issues[0])"
      );
      expect(src, `${rel} 仍直抛英文文案`).not.toContain('issues[0]?.message ?? "参数非法"');
    }
  });

  it("② 覆盖清单与 3.3.3 立项一致（11 处，防漏改/多改）", () => {
    expect(WRITE_ENDPOINTS).toHaveLength(11);
  });
});

describe("B. 运行时：非法 body → 400 code=40000 + 中文文案", () => {
  it("③ POST /vendors 空 body → 40000 中文「参数类型非法」，且非 zod 英文原文", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    const res = await vendorsRoute.POST(
      new Request("http://localhost/api/v1/admin/vendors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe(40000);
    expect(body.message).toContain("参数类型非法");
    expect(body.message).not.toMatch(/Invalid input|Expected |Required|must be/);
    expect(prismaState.vendor.create).not.toHaveBeenCalled();
  });

  it("④ PATCH /vendors/[id] priority 传字符串 → 40000 中文，且未触库", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    // 该路由先查存在性再校验 body（存在性优先：id 不存在时返回「厂商不存在」），故需预置行
    prismaState.vendor.findUnique.mockResolvedValueOnce({
      id: "v-1",
      code: "openai",
      name: "OpenAI",
      priority: 1,
      isActive: true,
    });
    const res = await vendorDetailRoute.PATCH(
      new Request("http://localhost/api/v1/admin/vendors/v-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ priority: "abc" }),
      }),
      { params: Promise.resolve({ id: "v-1" }) }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe(40000);
    expect(body.message).toContain("参数类型非法");
    expect(body.message).not.toMatch(/Expected number, received string/);
    expect(prismaState.vendor.update).not.toHaveBeenCalled();
  });
});
