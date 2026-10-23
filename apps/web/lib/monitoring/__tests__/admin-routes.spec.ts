/**
 * 管理端监控 API 路由单测（TASK-063）。
 *
 * 覆盖 4 端点：GET /sources、PATCH /sources/{key}、POST /sources/{key}/run、GET /changes。
 * 断言四类失败：401 未登录、403 越权、20004 未知源、50012 缺凭证源；run 的 202/429 锁语义；
 * changes 的分页与 sourceKey/kind/since 过滤；PATCH 仅白名单字段 + audit_logs(action=2)。
 * 所有成功响应均以 @aidean/shared 对应 zod Response schema parse。
 *
 * 策略同 admin-prices-batch.spec：vi.hoisted 桩 + vi.mock session/prisma/redis，
 * 直调 route 导出的 handler（动态路由第二参为 { params: Promise }，与 Next 15 一致）。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AdminMonitoringChangeListResponse,
  AdminMonitoringRunResponse,
  AdminMonitoringRunResponseV2,
  AdminMonitoringRunsResponse,
  AdminMonitoringSourceListResponse,
  MonitoringSourceSchema,
} from "@aidean/shared";

const guardStub = vi.hoisted(() => ({ requireAdminApi: vi.fn() }));
const redisState = vi.hoisted(() => ({
  client: null as null | {
    setNxEx: ReturnType<typeof vi.fn>;
    compareDelete: ReturnType<typeof vi.fn>;
  },
}));
const prismaState = vi.hoisted(() => ({
  monitoringSource: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  catalogChangeEvent: { findMany: vi.fn(), count: vi.fn() },
  auditLog: { create: vi.fn() },
  monitorRunRequest: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
}));

vi.mock("../../features/auth/session", () => guardStub);
vi.mock("../../db/prisma", () => ({ prisma: prismaState }));
vi.mock("../../db/redis", () => ({ getRedis: () => redisState.client }));

import { ApiError, ERROR_CODES } from "../../../app/api/v1/_lib/errors";

const sourcesRoute = await import("../../../app/api/v1/admin/monitoring/sources/route");
const sourceKeyRoute = await import("../../../app/api/v1/admin/monitoring/sources/[key]/route");
const runRoute = await import("../../../app/api/v1/admin/monitoring/sources/[key]/run/route");
const changesRoute = await import("../../../app/api/v1/admin/monitoring/changes/route");
const runsRoute = await import("../../../app/api/v1/admin/monitoring/sources/[key]/runs/route");

const RUN_ID = "44444444-4444-4444-8444-444444444444";
const ADMIN_ID = "55555555-5555-4555-8555-555555555555";
function runRow(over: Record<string, unknown> = {}) {
  return {
    id: RUN_ID,
    sourceKey: "deepseek-pricing",
    status: "pending",
    requestedBy: ADMIN_ID,
    resultCount: null,
    error: null,
    createdAt: new Date("2026-10-23T14:00:00.000Z"),
    startedAt: null,
    finishedAt: null,
    ...over,
  };
}

const SESSION_OK = { userId: "u-admin", tier: "ADMIN" };
const forbidden = (code: number = ERROR_CODES.FORBIDDEN) => new ApiError(code, "需要管理员权限");

const SOURCE_ID = "11111111-1111-4111-8111-111111111111";
const SNAPSHOT_ID = "22222222-2222-4222-8222-222222222222";
const EVENT_ID = "33333333-3333-4333-8333-333333333333";

function sourceRow(over: Record<string, unknown> = {}) {
  return {
    id: SOURCE_ID,
    key: "deepseek-pricing",
    label: "DeepSeek 公开定价页",
    tier: "S1",
    kind: "official",
    endpoint: "https://api-docs.deepseek.com/zh-cn/quick_start/pricing",
    docsUrl: "https://api-docs.deepseek.com/",
    authRequired: false,
    cadenceCron: "15 2 * * *",
    tosStatus: "pending",
    enabled: true,
    mappedEntityType: null,
    mappedEntityId: null,
    lastRunAt: new Date("2026-10-19T02:15:00.000Z"),
    lastStatus: "ok",
    lastCount: 12,
    lastError: null,
    ...over,
  };
}

function changeRow(over: Record<string, unknown> = {}) {
  return {
    id: EVENT_ID,
    kind: "listed",
    snapshotId: SNAPSHOT_ID,
    externalModelId: "deepseek-chat",
    normalizedModelId: "deepseek-chat",
    priceUnit: null,
    beforeInput: null,
    beforeOutput: null,
    afterInput: null,
    afterOutput: null,
    deltaPct: null,
    sourceUrl: "https://api-docs.deepseek.com/zh-cn/quick_start/pricing",
    detectedAt: new Date("2026-10-19T02:16:00.000Z"),
    source: { key: "deepseek-pricing" },
    ...over,
  };
}

const dec = (s: string) => ({ toString: () => s });
const ctx = (key: string) => ({ params: Promise.resolve({ key }) });

function req(method: string, url: string, body?: unknown, headers: Record<string, string> = {}) {
  return new Request(url, {
    method,
    headers: body === undefined ? headers : { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const BASE = "http://localhost/api/v1/admin/monitoring";

beforeEach(() => {
  vi.resetAllMocks();
  guardStub.requireAdminApi.mockResolvedValue(SESSION_OK);
  prismaState.auditLog.create.mockResolvedValue({});
  prismaState.monitorRunRequest.create.mockResolvedValue(runRow());
  redisState.client = null;
});

describe("GET /api/v1/admin/monitoring/sources", () => {
  it("未登录 → 401，不触库", async () => {
    guardStub.requireAdminApi.mockRejectedValue(forbidden(ERROR_CODES.UNAUTHENTICATED));
    const res = await sourcesRoute.GET(req("GET", `${BASE}/sources`));
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe(ERROR_CODES.UNAUTHENTICATED);
    expect(prismaState.monitoringSource.findMany).not.toHaveBeenCalled();
  });

  it("越权 → 403，不触库", async () => {
    guardStub.requireAdminApi.mockRejectedValue(forbidden());
    const res = await sourcesRoute.GET(req("GET", `${BASE}/sources`));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe(ERROR_CODES.FORBIDDEN);
    expect(prismaState.monitoringSource.findMany).not.toHaveBeenCalled();
  });

  it("200：按 key 升序、仅未软删；lastRunAt 转 ISO，响应可被契约 parse", async () => {
    prismaState.monitoringSource.findMany.mockResolvedValue([
      sourceRow(),
      sourceRow({ key: "openrouter", tier: "B", kind: "aggregator", lastRunAt: null, lastStatus: "never", lastCount: null }),
    ]);

    const res = await sourcesRoute.GET(req("GET", `${BASE}/sources`));
    expect(res.status).toBe(200);

    const arg = prismaState.monitoringSource.findMany.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.where).toEqual({ deletedAt: null });
    expect(arg.orderBy).toEqual({ key: "asc" });

    const body = await res.json();
    const data = AdminMonitoringSourceListResponse.parse(body.data);
    expect(data.items).toHaveLength(2);
    expect(data.items[0].lastRunAt).toBe("2026-10-19T02:15:00.000Z");
    expect(data.items[0].key).toBe("deepseek-pricing");
    expect(data.items[1].lastRunAt).toBeNull();
    // 内部 id 不外泄
    expect(body.data.items[0]).not.toHaveProperty("id");
  });
});

describe("PATCH /api/v1/admin/monitoring/sources/{key}", () => {
  it("200：只更新 enabled，写 audit_logs(action=2)，响应可被 MonitoringSourceSchema parse", async () => {
    prismaState.monitoringSource.findFirst.mockResolvedValue(sourceRow());
    prismaState.monitoringSource.update.mockResolvedValue(sourceRow({ enabled: false }));

    const res = await sourceKeyRoute.PATCH(
      req("PATCH", `${BASE}/sources/deepseek-pricing`, { enabled: false }, { "x-request-id": "trace-63" }),
      ctx("deepseek-pricing")
    );
    expect(res.status).toBe(200);

    const updateArg = prismaState.monitoringSource.update.mock.calls[0][0] as {
      where: { id: string };
      data: Record<string, unknown>;
    };
    expect(updateArg.where).toEqual({ id: SOURCE_ID });
    expect(updateArg.data).toEqual({ enabled: false });

    const audit = prismaState.auditLog.create.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(audit.data).toMatchObject({
      actorId: "u-admin",
      tableName: "monitoring_sources",
      recordId: SOURCE_ID,
      action: 2,
      changedFields: ["enabled"],
      requestId: "trace-63",
    });

    const body = await res.json();
    const dto = MonitoringSourceSchema.parse(body.data);
    expect(dto.enabled).toBe(false);
    expect(dto.lastStatus).toBe("ok");
  });

  it("200：enabled + cadenceCron 同时更新，changedFields 覆盖两字段", async () => {
    prismaState.monitoringSource.findFirst.mockResolvedValue(sourceRow());
    prismaState.monitoringSource.update.mockResolvedValue(
      sourceRow({ enabled: true, cadenceCron: "0 3 * * *" })
    );

    const res = await sourceKeyRoute.PATCH(
      req("PATCH", `${BASE}/sources/deepseek-pricing`, { enabled: true, cadenceCron: "0 3 * * *" }),
      ctx("deepseek-pricing")
    );
    expect(res.status).toBe(200);
    const updateArg = prismaState.monitoringSource.update.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(updateArg.data).toEqual({ enabled: true, cadenceCron: "0 3 * * *" });
    const audit = prismaState.auditLog.create.mock.calls[0][0] as { data: { changedFields: string[] } };
    expect(audit.data.changedFields).toEqual(["enabled", "cadenceCron"]);
  });

  it("非白名单字段（endpoint）→ 400，不触库", async () => {
    const res = await sourceKeyRoute.PATCH(
      req("PATCH", `${BASE}/sources/deepseek-pricing`, { endpoint: "https://evil.example.com" }),
      ctx("deepseek-pricing")
    );
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe(ERROR_CODES.BAD_REQUEST);
    expect(prismaState.monitoringSource.findFirst).not.toHaveBeenCalled();
    expect(prismaState.monitoringSource.update).not.toHaveBeenCalled();
  });

  it("空 body → 400（refine 至少一字段）", async () => {
    const res = await sourceKeyRoute.PATCH(
      req("PATCH", `${BASE}/sources/deepseek-pricing`, {}),
      ctx("deepseek-pricing")
    );
    expect(res.status).toBe(400);
    expect(prismaState.monitoringSource.findFirst).not.toHaveBeenCalled();
  });

  it("未知/软删源 → 404 + 20004，不更新不审计", async () => {
    prismaState.monitoringSource.findFirst.mockResolvedValue(null);
    const res = await sourceKeyRoute.PATCH(
      req("PATCH", `${BASE}/sources/nope`, { enabled: false }),
      ctx("nope")
    );
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe(ERROR_CODES.MONITOR_SOURCE_NOT_FOUND);
    expect(prismaState.monitoringSource.update).not.toHaveBeenCalled();
    expect(prismaState.auditLog.create).not.toHaveBeenCalled();
  });
});

describe("POST /api/v1/admin/monitoring/sources/{key}/run", () => {
  it("20004：未知源 → 404，不取锁", async () => {
    prismaState.monitoringSource.findFirst.mockResolvedValue(null);
    redisState.client = { setNxEx: vi.fn(), compareDelete: vi.fn() };

    const res = await runRoute.POST(req("POST", `${BASE}/sources/nope/run`), ctx("nope"));
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe(ERROR_CODES.MONITOR_SOURCE_NOT_FOUND);
    expect(redisState.client.setNxEx).not.toHaveBeenCalled();
  });

  it("50012：authRequired 源 → 503，不取锁不外连", async () => {
    prismaState.monitoringSource.findFirst.mockResolvedValue({
      key: "keyed-source",
      authRequired: true,
    });
    redisState.client = { setNxEx: vi.fn(), compareDelete: vi.fn() };

    const res = await runRoute.POST(req("POST", `${BASE}/sources/keyed-source/run`), ctx("keyed-source"));
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe(ERROR_CODES.MONITOR_SOURCE_CREDENTIAL_MISSING);
    expect(redisState.client.setNxEx).not.toHaveBeenCalled();
  });

  it("202：取锁成功即受理，TTL=300，响应可被契约 parse", async () => {
    prismaState.monitoringSource.findFirst.mockResolvedValue({
      key: "deepseek-pricing",
      authRequired: false,
    });
    const setNxEx = vi.fn().mockResolvedValue("OK");
    redisState.client = { setNxEx, compareDelete: vi.fn() };

    const res = await runRoute.POST(
      req("POST", `${BASE}/sources/deepseek-pricing/run`, undefined, { "x-request-id": "trace-run" }),
      ctx("deepseek-pricing")
    );
    expect(res.status).toBe(202);
    expect(setNxEx).toHaveBeenCalledWith("lock:monitor:run:deepseek-pricing", expect.any(String), 300);

    const body = await res.json();
    expect(body.requestId).toBe("trace-run");
    // 向后兼容：旧字段保留 + V2 requestId（意图行 id）
    expect(AdminMonitoringRunResponse.parse(body.data)).toEqual({ accepted: true, sourceKey: "deepseek-pricing", lockTtlSeconds: 300 });
    expect(AdminMonitoringRunResponseV2.parse(body.data)).toEqual({ accepted: true, requestId: RUN_ID });
    // T120-12：插入 pending 意图行 + 审计 INSERT
    expect(prismaState.monitorRunRequest.create).toHaveBeenCalledWith({
      data: { sourceKey: "deepseek-pricing", requestedBy: "u-admin", status: "pending" },
    });
    const audit = prismaState.auditLog.create.mock.calls[0][0].data;
    expect(audit).toMatchObject({ tableName: "monitor_run_requests", recordId: RUN_ID, action: 1, actorId: "u-admin" });
  });

  it("T120-12：DB 部分唯一索引冲突（P2002，Redis 缺失时的权威防线）→ 429 + 10006，不写审计", async () => {
    prismaState.monitoringSource.findFirst.mockResolvedValue({ key: "deepseek-pricing", authRequired: false });
    prismaState.monitorRunRequest.create.mockRejectedValue(Object.assign(new Error("dup"), { code: "P2002" }));
    const res = await runRoute.POST(req("POST", `${BASE}/sources/deepseek-pricing/run`), ctx("deepseek-pricing"));
    expect(res.status).toBe(429);
    expect((await res.json()).code).toBe(ERROR_CODES.TOO_MANY_REQUESTS);
    expect(prismaState.auditLog.create).not.toHaveBeenCalled();
  });

  it("T120-12：Redis 故障（setNxEx 抛错）→ 可失降级，仍由 DB 受理 202", async () => {
    prismaState.monitoringSource.findFirst.mockResolvedValue({ key: "deepseek-pricing", authRequired: false });
    redisState.client = { setNxEx: vi.fn().mockRejectedValue(new Error("ECONNRESET")), compareDelete: vi.fn() };
    const res = await runRoute.POST(req("POST", `${BASE}/sources/deepseek-pricing/run`), ctx("deepseek-pricing"));
    expect(res.status).toBe(202);
    expect(prismaState.monitorRunRequest.create).toHaveBeenCalledTimes(1);
  });

  it("T120-12：非管理员 → 403，不入队", async () => {
    guardStub.requireAdminApi.mockRejectedValue(forbidden());
    const res = await runRoute.POST(req("POST", `${BASE}/sources/deepseek-pricing/run`), ctx("deepseek-pricing"));
    expect(res.status).toBe(403);
    expect(prismaState.monitorRunRequest.create).not.toHaveBeenCalled();
  });

  it("锁内重复触发 → 429 + 10006", async () => {
    prismaState.monitoringSource.findFirst.mockResolvedValue({
      key: "deepseek-pricing",
      authRequired: false,
    });
    redisState.client = { setNxEx: vi.fn().mockResolvedValue(null), compareDelete: vi.fn() };

    const res = await runRoute.POST(req("POST", `${BASE}/sources/deepseek-pricing/run`), ctx("deepseek-pricing"));
    expect(res.status).toBe(429);
    expect((await res.json()).code).toBe(ERROR_CODES.TOO_MANY_REQUESTS);
    expect(prismaState.monitorRunRequest.create).not.toHaveBeenCalled();
  });

  it("无 REDIS_URL（getRedis=null）→ fail-open 直受理 202", async () => {
    prismaState.monitoringSource.findFirst.mockResolvedValue({
      key: "deepseek-pricing",
      authRequired: false,
    });
    redisState.client = null;

    const res = await runRoute.POST(req("POST", `${BASE}/sources/deepseek-pricing/run`), ctx("deepseek-pricing"));
    expect(res.status).toBe(202);
    expect((await res.json()).data.accepted).toBe(true);
  });
});

describe("GET /api/v1/admin/monitoring/changes", () => {
  it("越权 → 403，不触库", async () => {
    guardStub.requireAdminApi.mockRejectedValue(forbidden());
    const res = await changesRoute.GET(req("GET", `${BASE}/changes`));
    expect(res.status).toBe(403);
    expect(prismaState.catalogChangeEvent.findMany).not.toHaveBeenCalled();
  });

  it("分页 + sourceKey/kind/since 过滤；price_changed 带价格与 deltaPct，响应可被契约 parse", async () => {
    prismaState.catalogChangeEvent.findMany.mockResolvedValue([
      changeRow({
        kind: "price_changed",
        priceUnit: "cny_per_1m_tokens",
        beforeInput: dec("2"),
        beforeOutput: dec("8"),
        afterInput: dec("2.5"),
        afterOutput: dec("10"),
        deltaPct: 25,
      }),
      changeRow({ id: "44444444-4444-4444-8444-444444444444", kind: "listed" }),
    ]);
    prismaState.catalogChangeEvent.count.mockResolvedValue(25);

    const url =
      `${BASE}/changes?page=2&pageSize=10&sourceKey=deepseek-pricing&kind=price_changed` +
      `&since=${encodeURIComponent("2026-10-01T00:00:00.000Z")}`;
    const res = await changesRoute.GET(req("GET", url));
    expect(res.status).toBe(200);

    const arg = prismaState.catalogChangeEvent.findMany.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.where).toEqual({
      source: { key: "deepseek-pricing" },
      kind: "price_changed",
      detectedAt: { gte: new Date("2026-10-01T00:00:00.000Z") },
    });
    expect(arg.skip).toBe(10);
    expect(arg.take).toBe(10);
    expect(arg.orderBy).toEqual([{ detectedAt: "desc" }, { id: "desc" }]);

    const body = await res.json();
    const data = AdminMonitoringChangeListResponse.parse(body.data);
    expect(data).toMatchObject({ total: 25, page: 2, pageSize: 10, totalPages: 3 });
    expect(data.items[0]).toMatchObject({
      kind: "price_changed",
      sourceKey: "deepseek-pricing",
      priceUnit: "cny_per_1m_tokens",
      before: { input: "2", output: "8" },
      after: { input: "2.5", output: "10" },
      deltaPct: 25,
    });
    // 非 price_changed 事件不得带价格键
    expect(data.items[1]).not.toHaveProperty("before");
    expect(data.items[1]).not.toHaveProperty("deltaPct");
  });

  it("无过滤条件：默认 page=1/pageSize=20，total=0 时 totalPages=0", async () => {
    prismaState.catalogChangeEvent.findMany.mockResolvedValue([]);
    prismaState.catalogChangeEvent.count.mockResolvedValue(0);

    const res = await changesRoute.GET(req("GET", `${BASE}/changes`));
    expect(res.status).toBe(200);
    const arg = prismaState.catalogChangeEvent.findMany.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.where).toEqual({});
    expect(arg.skip).toBe(0);
    expect(arg.take).toBe(20);
    expect(AdminMonitoringChangeListResponse.parse((await res.json()).data)).toMatchObject({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    });
  });

  it("pageSize=51 越界 → 400，不触库", async () => {
    const res = await changesRoute.GET(req("GET", `${BASE}/changes?pageSize=51`));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe(ERROR_CODES.BAD_REQUEST);
    expect(prismaState.catalogChangeEvent.findMany).not.toHaveBeenCalled();
  });

  it("since 非 ISO datetime → 400", async () => {
    const res = await changesRoute.GET(req("GET", `${BASE}/changes?since=2026-10-01`));
    expect(res.status).toBe(400);
    expect(prismaState.catalogChangeEvent.findMany).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/admin/monitoring/sources/{key}/runs（T120-12）", () => {
  it("非管理员 → 403，不触库", async () => {
    guardStub.requireAdminApi.mockRejectedValue(forbidden());
    const res = await runsRoute.GET(req("GET", `${BASE}/sources/deepseek-pricing/runs`), ctx("deepseek-pricing"));
    expect(res.status).toBe(403);
    expect(prismaState.monitorRunRequest.findMany).not.toHaveBeenCalled();
    expect(guardStub.requireAdminApi).toHaveBeenCalledWith("admin.sync.read");
  });

  it("200：默认 page=1/pageSize=10，createdAt 倒序，日期转 ISO，响应可被契约 parse", async () => {
    prismaState.monitoringSource.findFirst.mockResolvedValue({ key: "deepseek-pricing" });
    prismaState.monitorRunRequest.findMany.mockResolvedValue([
      runRow({ status: "done", resultCount: 12, startedAt: new Date("2026-10-23T14:01:00.000Z"), finishedAt: new Date("2026-10-23T14:02:00.000Z") }),
    ]);
    prismaState.monitorRunRequest.count.mockResolvedValue(1);
    const res = await runsRoute.GET(req("GET", `${BASE}/sources/deepseek-pricing/runs`), ctx("deepseek-pricing"));
    expect(res.status).toBe(200);
    const data = AdminMonitoringRunsResponse.parse((await res.json()).data);
    expect(data).toMatchObject({ total: 1, page: 1, pageSize: 10 });
    expect(data.items[0]).toMatchObject({ status: "done", resultCount: 12, finishedAt: "2026-10-23T14:02:00.000Z" });
    expect(prismaState.monitorRunRequest.findMany).toHaveBeenCalledWith({
      where: { sourceKey: "deepseek-pricing" }, orderBy: { createdAt: "desc" }, skip: 0, take: 10,
    });
  });

  it("pageSize=51 越界 → 400；page=3&pageSize=50 → skip 100", async () => {
    const bad = await runsRoute.GET(req("GET", `${BASE}/sources/deepseek-pricing/runs?pageSize=51`), ctx("deepseek-pricing"));
    expect(bad.status).toBe(400);
    prismaState.monitoringSource.findFirst.mockResolvedValue({ key: "deepseek-pricing" });
    prismaState.monitorRunRequest.findMany.mockResolvedValue([]);
    prismaState.monitorRunRequest.count.mockResolvedValue(0);
    const ok = await runsRoute.GET(req("GET", `${BASE}/sources/deepseek-pricing/runs?page=3&pageSize=50`), ctx("deepseek-pricing"));
    expect(ok.status).toBe(200);
    expect(prismaState.monitorRunRequest.findMany.mock.calls[0][0]).toMatchObject({ skip: 100, take: 50 });
  });

  it("未知源 → 404 + 20004", async () => {
    prismaState.monitoringSource.findFirst.mockResolvedValue(null);
    const res = await runsRoute.GET(req("GET", `${BASE}/sources/nope/runs`), ctx("nope"));
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe(ERROR_CODES.MONITOR_SOURCE_NOT_FOUND);
  });
});
