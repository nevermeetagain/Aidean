/**
 * B11-03a 路由单测：protocols/[id]、capabilities/[id]（GET/PATCH/DELETE）+ 列表 POST 校验下沉。
 * mock prisma 的方式对齐 lib/features/admin/__tests__/scripts-executions-route.spec.ts。
 *
 * 覆盖：成功信封 / 非法 id / 不存在 / 校验失败（未知键、空体、枚举外值）/ 唯一冲突 P2002 / 并发删除 P2025 /
 *       引用完整性（MODEL_NOT_FOUND）/ RBAC 权限码与 403 透传 / 审计 action+tableName / revalidatePath。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("../../../../db/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    protocolCompatibility: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), update: vi.fn(), delete: vi.fn(), upsert: vi.fn() },
    capabilityMatrix: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), update: vi.fn(), delete: vi.fn(), upsert: vi.fn() },
    aiModel: { findFirst: vi.fn() },
    vendor: { findFirst: vi.fn() },
    modelProvider: { findUnique: vi.fn() },
    aPIStation: { findUnique: vi.fn() },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  },
}));

vi.mock("../../../../features/auth/session", () => ({
  requireAdminApi: vi.fn().mockResolvedValue({ userId: "admin-1" }),
}));

import { prisma } from "../../../../db/prisma";
import { requireAdminApi } from "../../../../features/auth/session";
import { revalidatePath } from "next/cache";
import { ApiError, ERROR_CODES } from "../../../../../app/api/v1/_lib/errors";

const ID = "0192f0c4-7a1b-7c3d-8e9f-0123456789ab";
const MODEL_ID = "0192f0c4-0000-7000-8000-000000000001";

const pRow = {
  id: ID, entityType: "model", entityId: MODEL_ID, protocol: "OPENAI", supported: true,
  probeMethod: "backfill", probeResult: null, confidence: 0.6,
  probedAt: new Date("2026-10-22T00:00:00Z"), createdAt: new Date("2026-10-22T00:00:00Z"), updatedAt: new Date("2026-10-22T00:00:00Z"),
};
const cRow = {
  id: ID, modelId: MODEL_ID, capability: "reasoning", supported: true, maxContextLength: null, detail: null,
  source: "official", confidence: 0.6,
  detectedAt: new Date("2026-10-22T00:00:00Z"), createdAt: new Date("2026-10-22T00:00:00Z"), updatedAt: new Date("2026-10-22T00:00:00Z"),
};

const protoRoute = () => import("../../../../../app/api/v1/admin/protocols/[id]/route");
const capRoute = () => import("../../../../../app/api/v1/admin/capabilities/[id]/route");
const protoList = () => import("../../../../../app/api/v1/admin/protocols/route");
const capList = () => import("../../../../../app/api/v1/admin/capabilities/route");

type Handler = (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
async function call(h: Handler, method: string, id: string, body?: unknown) {
  const req = new Request(`http://localhost/x/${id}`, {
    method,
    headers: { "content-type": "application/json", "x-request-id": "req-1" },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
  const res = await h(req, { params: Promise.resolve({ id }) });
  return { status: res.status, json: (await res.json()) as { code: number; message: string; data: any } };
}
async function post(h: (req: Request) => Promise<Response>, body: unknown) {
  const res = await h(new Request("http://localhost/x", { method: "POST", body: JSON.stringify(body) }));
  return { status: res.status, json: (await res.json()) as { code: number; message: string; data: any } };
}

const auditArg = () => vi.mocked(prisma.auditLog.create).mock.calls[0]![0].data as Record<string, unknown>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAdminApi).mockResolvedValue({ userId: "admin-1" } as never);
  vi.mocked(prisma.auditLog.create).mockResolvedValue({} as never);
  vi.mocked(prisma.aiModel.findFirst).mockResolvedValue({ id: MODEL_ID } as never);
});

describe("protocols/[id]", () => {
  it("GET 成功：read 权限码 + 信封 code=0", async () => {
    vi.mocked(prisma.protocolCompatibility.findUnique).mockResolvedValue(pRow as never);
    const { status, json } = await call((await protoRoute()).GET as Handler, "GET", ID);
    expect(status).toBe(200);
    expect(json.code).toBe(0);
    expect(json.data.id).toBe(ID);
    expect(requireAdminApi).toHaveBeenCalledWith("admin.protocols.read");
  });

  it("GET 非法 id → 40000 且不触库", async () => {
    const { status, json } = await call((await protoRoute()).GET as Handler, "GET", "not-a-uuid");
    expect(status).toBe(400);
    expect(json.code).toBe(ERROR_CODES.BAD_REQUEST);
    expect(json.data).toBeNull();
    expect(json.message).toBe("id 非法（须为 UUID）");
    expect(prisma.protocolCompatibility.findUnique).not.toHaveBeenCalled();
  });

  it("GET 不存在 → 40000「协议兼容记录不存在」", async () => {
    vi.mocked(prisma.protocolCompatibility.findUnique).mockResolvedValue(null as never);
    const { json } = await call((await protoRoute()).GET as Handler, "GET", ID);
    expect(json.code).toBe(40000);
    expect(json.message).toContain("不存在");
  });

  it("RBAC：requireAdminApi 抛 FORBIDDEN → 403 + 10008，且不触库", async () => {
    vi.mocked(requireAdminApi).mockRejectedValueOnce(new ApiError(ERROR_CODES.FORBIDDEN, "无权限"));
    const { status, json } = await call((await protoRoute()).DELETE as Handler, "DELETE", ID);
    expect(status).toBe(403);
    expect(json.code).toBe(10008);
    expect(prisma.protocolCompatibility.findUnique).not.toHaveBeenCalled();
  });

  it("PATCH 成功：write 权限 + update 数据 + 审计 action=2 + revalidate", async () => {
    vi.mocked(prisma.protocolCompatibility.findUnique).mockResolvedValue(pRow as never);
    vi.mocked(prisma.protocolCompatibility.update).mockResolvedValue({ ...pRow, supported: false } as never);
    const { status, json } = await call((await protoRoute()).PATCH as Handler, "PATCH", ID, { supported: false, confidence: 0.9 });
    expect(status).toBe(200);
    expect(json.data.supported).toBe(false);
    expect(requireAdminApi).toHaveBeenCalledWith("admin.protocols.write");
    const upd = vi.mocked(prisma.protocolCompatibility.update).mock.calls[0]![0] as { data: Record<string, unknown> };
    expect(upd.data.supported).toBe(false);
    expect(upd.data.confidence).toBe(0.9);
    expect(upd.data.probedAt).toBeInstanceOf(Date);
    const a = auditArg();
    expect(a.tableName).toBe("protocol_compatibilities");
    expect(a.action).toBe(2);
    expect(a.changedFields).toEqual(["supported", "confidence"]);
    expect(a.requestId).toBe("req-1");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/protocols");
  });

  it.each([
    ["空对象", {}],
    ["未知键（strict）", { foo: 1 }],
    ["协议枚举外值（旧小写口径）", { protocol: "openai_chat" }],
    ["confidence 越界", { confidence: 2 }],
    ["非 JSON 体", "{bad"],
  ])("PATCH 校验失败 %s → 40000 且不写库/不审计", async (_n, body) => {
    vi.mocked(prisma.protocolCompatibility.findUnique).mockResolvedValue(pRow as never);
    const { status, json } = await call((await protoRoute()).PATCH as Handler, "PATCH", ID, body);
    expect(status).toBe(400);
    expect(json.code).toBe(40000);
    expect(prisma.protocolCompatibility.update).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("PATCH 未知键文案点名字段", async () => {
    vi.mocked(prisma.protocolCompatibility.findUnique).mockResolvedValue(pRow as never);
    const { json } = await call((await protoRoute()).PATCH as Handler, "PATCH", ID, { foo: 1 });
    expect(json.message).toBe("未知字段：foo");
  });

  it("PATCH 改键撞唯一（P2002）→ 40000「…已存在」，不写审计", async () => {
    vi.mocked(prisma.protocolCompatibility.findUnique).mockResolvedValue(pRow as never);
    vi.mocked(prisma.protocolCompatibility.update).mockRejectedValue(Object.assign(new Error("unique"), { code: "P2002" }));
    const { json } = await call((await protoRoute()).PATCH as Handler, "PATCH", ID, { protocol: "ANTHROPIC" });
    expect(json.code).toBe(40000);
    expect(json.message).toContain("已存在");
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("PATCH 改 entityId 指向不存在模型 → 20001 MODEL_NOT_FOUND", async () => {
    vi.mocked(prisma.protocolCompatibility.findUnique).mockResolvedValue(pRow as never);
    vi.mocked(prisma.aiModel.findFirst).mockResolvedValue(null as never);
    const { json } = await call((await protoRoute()).PATCH as Handler, "PATCH", ID, { entityId: "ghost" });
    expect(json.code).toBe(ERROR_CODES.MODEL_NOT_FOUND);
    expect(prisma.protocolCompatibility.update).not.toHaveBeenCalled();
  });

  it("PATCH 未知 Prisma 异常 → 50000（不泄露细节）", async () => {
    vi.mocked(prisma.protocolCompatibility.findUnique).mockResolvedValue(pRow as never);
    vi.mocked(prisma.protocolCompatibility.update).mockRejectedValue(new Error("db down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { status, json } = await call((await protoRoute()).PATCH as Handler, "PATCH", ID, { supported: true });
    spy.mockRestore();
    expect(status).toBe(500);
    expect(json.code).toBe(50000);
    expect(json.message).not.toContain("db down");
  });

  it("DELETE 成功：审计 action=3 带 oldData 快照", async () => {
    vi.mocked(prisma.protocolCompatibility.findUnique).mockResolvedValue(pRow as never);
    vi.mocked(prisma.protocolCompatibility.delete).mockResolvedValue(pRow as never);
    const { json } = await call((await protoRoute()).DELETE as Handler, "DELETE", ID);
    expect(json.data).toEqual({ deleted: true, id: ID });
    const a = auditArg();
    expect(a.action).toBe(3);
    expect((a.oldData as { protocol: string }).protocol).toBe("OPENAI");
  });

  it("DELETE 不存在 → 40000；并发删除 P2025 → 40000", async () => {
    const r = await protoRoute();
    vi.mocked(prisma.protocolCompatibility.findUnique).mockResolvedValueOnce(null as never);
    expect((await call(r.DELETE as Handler, "DELETE", ID)).json.code).toBe(40000);
    vi.mocked(prisma.protocolCompatibility.findUnique).mockResolvedValueOnce(pRow as never);
    vi.mocked(prisma.protocolCompatibility.delete).mockRejectedValueOnce(Object.assign(new Error("gone"), { code: "P2025" }));
    const { json } = await call(r.DELETE as Handler, "DELETE", ID);
    expect(json.code).toBe(40000);
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });
});

describe("capabilities/[id]", () => {
  it("GET 成功 + read 权限码", async () => {
    vi.mocked(prisma.capabilityMatrix.findUnique).mockResolvedValue(cRow as never);
    const { json } = await call((await capRoute()).GET as Handler, "GET", ID);
    expect(json.code).toBe(0);
    expect(requireAdminApi).toHaveBeenCalledWith("admin.capabilities.read");
  });

  it("PATCH maxContextLength + 审计 capability_matrices", async () => {
    vi.mocked(prisma.capabilityMatrix.findUnique).mockResolvedValue(cRow as never);
    vi.mocked(prisma.capabilityMatrix.update).mockResolvedValue({ ...cRow, maxContextLength: 200000 } as never);
    const { json } = await call((await capRoute()).PATCH as Handler, "PATCH", ID, { maxContextLength: 200000 });
    expect(json.code).toBe(0);
    expect(auditArg().tableName).toBe("capability_matrices");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/capabilities");
  });

  it("PATCH 能力枚举外值 → 40000", async () => {
    vi.mocked(prisma.capabilityMatrix.findUnique).mockResolvedValue(cRow as never);
    const { json } = await call((await capRoute()).PATCH as Handler, "PATCH", ID, { capability: "telepathy" });
    expect(json.code).toBe(40000);
  });

  it("PATCH P2002 → 40000「…已存在」", async () => {
    vi.mocked(prisma.capabilityMatrix.findUnique).mockResolvedValue(cRow as never);
    vi.mocked(prisma.capabilityMatrix.update).mockRejectedValue({ code: "P2002" });
    const { json } = await call((await capRoute()).PATCH as Handler, "PATCH", ID, { source: "observed" });
    expect(json.message).toContain("已存在");
  });

  it("DELETE 成功 + action=3", async () => {
    vi.mocked(prisma.capabilityMatrix.findUnique).mockResolvedValue(cRow as never);
    vi.mocked(prisma.capabilityMatrix.delete).mockResolvedValue(cRow as never);
    const { json } = await call((await capRoute()).DELETE as Handler, "DELETE", ID);
    expect(json.data.deleted).toBe(true);
    expect(auditArg().action).toBe(3);
  });
});

describe("列表 POST（校验下沉 service，upsert 语义不变）", () => {
  it("protocols POST 新建 → action=1；命中既有 → action=2", async () => {
    const { POST } = await protoList();
    vi.mocked(prisma.protocolCompatibility.findUnique).mockResolvedValueOnce(null as never);
    vi.mocked(prisma.protocolCompatibility.upsert).mockResolvedValue(pRow as never);
    const body = { entityType: "model", entityId: MODEL_ID, protocol: "OPENAI", supported: true };
    expect((await post(POST, body)).json.code).toBe(0);
    expect(auditArg().action).toBe(1);
    vi.clearAllMocks();
    vi.mocked(requireAdminApi).mockResolvedValue({ userId: "admin-1" } as never);
    vi.mocked(prisma.aiModel.findFirst).mockResolvedValue({ id: MODEL_ID } as never);
    vi.mocked(prisma.protocolCompatibility.findUnique).mockResolvedValueOnce(pRow as never);
    vi.mocked(prisma.protocolCompatibility.upsert).mockResolvedValue(pRow as never);
    await post(POST, body);
    expect(auditArg().action).toBe(2);
  });

  it("protocols POST 缺 supported / 旧小写协议 → 40000，不触库", async () => {
    const { POST } = await protoList();
    expect((await post(POST, { entityType: "model", entityId: MODEL_ID, protocol: "OPENAI" })).json.code).toBe(40000);
    expect((await post(POST, { entityType: "model", entityId: MODEL_ID, protocol: "openai_chat", supported: true })).json.code).toBe(40000);
    expect(prisma.protocolCompatibility.upsert).not.toHaveBeenCalled();
  });

  it("protocols POST vendor 不存在 → 40000", async () => {
    const { POST } = await protoList();
    vi.mocked(prisma.vendor.findFirst).mockResolvedValue(null as never);
    const { json } = await post(POST, { entityType: "vendor", entityId: "v-x", protocol: "GOOGLE", supported: true });
    expect(json.code).toBe(40000);
    expect(json.message).toContain("实体不存在");
  });

  it("capabilities POST 模型不存在 → 20001；成功时 source 默认 official", async () => {
    const { POST } = await capList();
    vi.mocked(prisma.aiModel.findFirst).mockResolvedValueOnce(null as never);
    expect((await post(POST, { modelId: "ghost", capability: "vision", supported: true })).json.code).toBe(20001);
    vi.mocked(prisma.capabilityMatrix.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.capabilityMatrix.upsert).mockResolvedValue(cRow as never);
    expect((await post(POST, { modelId: MODEL_ID, capability: "vision", supported: true })).json.code).toBe(0);
    const up = vi.mocked(prisma.capabilityMatrix.upsert).mock.calls[0]![0] as { where: { modelId_capability_source: { source: string } } };
    expect(up.where.modelId_capability_source.source).toBe("official");
  });
});

describe("列表 GET 筛选（B11-03b G4 依赖：source 等值 + modelId 子串）", () => {
  const get = async (qs: string) => {
    vi.mocked(prisma.$transaction).mockResolvedValue([[cRow], 1] as never);
    const { GET } = await capList();
    const res = await (GET as (req: Request) => Promise<Response>)(new Request(`http://localhost/x?${qs}`));
    return { status: res.status, code: ((await res.json()) as { code: number }).code };
  };
  const findManyWhere = (call = 0) =>
    (vi.mocked(prisma.capabilityMatrix.findMany).mock.calls[call]![0] as { where: Record<string, unknown> }).where;

  it("source 进 where（等值），modelId 走 contains；count 与 findMany 同 where", async () => {
    const r = await get("page=1&pageSize=50&source=official&modelId=0001");
    expect(r).toEqual({ status: 200, code: 0 });
    expect(findManyWhere()).toEqual({ modelId: { contains: "0001" }, source: "official" });
    const countArg = vi.mocked(prisma.capabilityMatrix.count).mock.calls[0]![0] as { where: Record<string, unknown> };
    expect(countArg.where).toEqual(findManyWhere());
  });

  it("无筛选参数 → where 为空对象（全量分页）", async () => {
    await get("page=1&pageSize=50");
    expect(findManyWhere()).toEqual({});
  });

  it("source 值域外不 500（String 列只影响结果集）", async () => {
    const r = await get("source=not_a_source");
    expect(r.status).toBe(200);
    expect(findManyWhere()).toEqual({ source: "not_a_source" });
  });
});
