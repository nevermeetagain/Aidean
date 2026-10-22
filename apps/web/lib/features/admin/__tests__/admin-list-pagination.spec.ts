/**
 * 后台列表端点分页守卫单测（B11-11 / DEF-011-15 / Q-11-05=A）。
 *
 * 口径（2026-10-22 验收指令）：非法整数串（`?page=abc` / `?pageSize=xyz` / 整数过滤参数非数字）
 * → HTTP 400 + code=40000，且 **Prisma 完全不被调用**（比「回退默认值」更强的保证：
 * 结构上不可能把 NaN 送进 skip/take/where）。空串视同缺省；越界合法值仍钳制（不 400）。
 *
 * 覆盖 15 个端点（12 无守卫 + 3 `||` 兜底），每个端点一个 describe；
 * 断言对象始终是「送进 Prisma 的实参」或「未调用」。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../db/prisma", () => ({
  prisma: {
    auditLog: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    announcement: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    aPIStation: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    benchmark: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    evaluation: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    userFreeQuota: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    scheduledScript: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    syncBatch: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    modelChangeLog: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    userTierMapping: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    capabilityMatrix: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    discoveryCandidate: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    protocolCompatibility: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    marketSnapshot: { findMany: vi.fn().mockResolvedValue([]) },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
  },
}));

vi.mock("../../../features/auth/session", () => ({
  requireAdminApi: vi.fn().mockResolvedValue({ userId: "admin-1" }),
}));

vi.mock("../../../intelligence/report-generator", () => ({
  listReports: vi.fn().mockResolvedValue([]),
  generateDailyReport: vi.fn(),
}));

vi.mock("../../../intelligence/snapshot", () => ({
  listSnapshots: vi.fn().mockResolvedValue([]),
  generateSnapshot: vi.fn(),
}));

vi.mock("../../../features/admin/matrix/service", () => ({
  upsertCapability: vi.fn(),
  upsertProtocol: vi.fn(),
}));

vi.mock("../../../sync/sync-orchestrator", () => ({
  SyncOrchestrator: class {
    async execute() {
      return {};
    }
  },
}));

vi.mock("../../../sync/sources/adapters", () => ({ ADAPTER_REGISTRY: {} }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { prisma } from "../../../db/prisma";
import { listReports } from "../../../intelligence/report-generator";
import { listSnapshots } from "../../../intelligence/snapshot";

/** 静态 import map：避免动态 import 模板串触发 vite:dynamic-import-vars 警告 */
const ROUTES: Record<string, () => Promise<{ GET: (req: Request) => Promise<Response> }>> = {
  announcements: () => import("../../../../app/api/v1/admin/announcements/route"),
  "api-stations": () => import("../../../../app/api/v1/admin/api-stations/route"),
  "audit-logs": () => import("../../../../app/api/v1/admin/audit-logs/route"),
  benchmarks: () => import("../../../../app/api/v1/admin/benchmarks/route"),
  evaluations: () => import("../../../../app/api/v1/admin/evaluations/route"),
  "free-quotas": () => import("../../../../app/api/v1/admin/free-quotas/route"),
  scripts: () => import("../../../../app/api/v1/admin/scripts/route"),
  "sync/batches": () => import("../../../../app/api/v1/admin/sync/batches/route"),
  "sync/changes": () => import("../../../../app/api/v1/admin/sync/changes/route"),
  "tier-mappings": () => import("../../../../app/api/v1/admin/tier-mappings/route"),
  capabilities: () => import("../../../../app/api/v1/admin/capabilities/route"),
  "discovery/candidates": () => import("../../../../app/api/v1/admin/discovery/candidates/route"),
  protocols: () => import("../../../../app/api/v1/admin/protocols/route"),
  "intelligence/reports": () => import("../../../../app/api/v1/admin/intelligence/reports/route"),
  "intelligence/snapshots": () => import("../../../../app/api/v1/admin/intelligence/snapshots/route"),
};

const callRoute = async (path: string, qs: string) => {
  const { GET } = await ROUTES[path]!();
  const res = await GET(new Request(`http://localhost/api/v1/admin/${path}${qs}`) as never);
  return { res, json: (await res.json()) as { code: number; message: string; data: unknown } };
};

type FindManyCall = { skip?: number; take?: number; where?: Record<string, unknown> };

/** 从 mock 函数取第 index 次调用的首个实参（unknown 中转，兼容 Prisma 方法签名） */
const argOf = (mockFn: unknown, index = 0): FindManyCall => {
  const calls = (mockFn as { mock: { calls: unknown[][] } }).mock.calls;
  return calls[index]![0] as FindManyCall;
};

const modelMock = (model: string) =>
  (prisma as unknown as Record<string, { findMany: unknown; count: unknown }>)[model]!;

const MODELS = [
  "auditLog",
  "announcement",
  "aPIStation",
  "benchmark",
  "evaluation",
  "userFreeQuota",
  "scheduledScript",
  "syncBatch",
  "modelChangeLog",
  "userTierMapping",
  "capabilityMatrix",
  "discoveryCandidate",
  "protocolCompatibility",
  "marketSnapshot",
];

beforeEach(() => {
  vi.clearAllMocks();
  for (const model of MODELS) {
    const m = modelMock(model) as { findMany?: { mockResolvedValue: (v: unknown) => void }; count?: { mockResolvedValue: (v: unknown) => void } };
    m.findMany?.mockResolvedValue([]);
    m.count?.mockResolvedValue(0);
  }
});

/** 生成一个 page/pageSize 端点的用例组 */
function describePaginated(opts: {
  path: string;
  model: string;
  defaultPageSize: number;
  /** 整数过滤参数（非法串应 400） */
  intFilters?: string[];
}) {
  const { path, model, defaultPageSize, intFilters = [] } = opts;

  describe(`GET /api/v1/admin/${path} 分页守卫（B11-11）`, () => {
    const badCases = [
      "?page=abc",
      "?pageSize=xyz",
      "?page=abc&pageSize=xyz",
      // 空白串不是空串：解码为 " "，parseInt 得 NaN → 400（"空白即非法"口径）
      "?page=%20",
      ...intFilters.map((k) => `?${k}=abc`),
    ];

    it.each(badCases)("%s → 400 且不触达 Prisma（NaN 不可能进 skip/take/where）", async (qs) => {
      const { res, json } = await callRoute(path, qs);
      expect(res.status).toBe(400);
      expect(json.code).toBe(40000);
      expect(modelMock(model).findMany).not.toHaveBeenCalled();
      expect(modelMock(model).count).not.toHaveBeenCalled();
    });

    // 空过滤值（表单清空）视同缺省：不得因空串抛 400，也不得把该键写进 where
    if (intFilters.length > 0) {
      it.each(intFilters.map((k) => `?${k}=`))("%s → 200 且 where 不含该键", async (qs) => {
        const { res } = await callRoute(path, qs);
        expect(res.status).toBe(200);
        const where = argOf(modelMock(model).findMany).where ?? {};
        for (const key of intFilters) expect(where).not.toHaveProperty(key);
      });
    }

    it("正常值不变：page=2&pageSize=10 → skip=10 take=10", async () => {
      const { res } = await callRoute(path, "?page=2&pageSize=10");
      expect(res.status).toBe(200);
      expect(argOf(modelMock(model).findMany)).toMatchObject({ skip: 10, take: 10 });
    });

    it(`越界合法值仍钳制：pageSize=1000 → take=100；缺省 → take=${defaultPageSize}`, async () => {
      await callRoute(path, "?pageSize=1000");
      expect(argOf(modelMock(model).findMany).take).toBe(100);

      vi.clearAllMocks();
      await callRoute(path, "");
      expect(argOf(modelMock(model).findMany).take).toBe(defaultPageSize);
    });

    it("空串视同缺省：page=&pageSize= → 回退 1/默认值", async () => {
      const { res } = await callRoute(path, "?page=&pageSize=");
      expect(res.status).toBe(200);
      expect(argOf(modelMock(model).findMany)).toMatchObject({ skip: 0, take: defaultPageSize });
    });
  });
}

describePaginated({ path: "announcements", model: "announcement", defaultPageSize: 20 });
describePaginated({ path: "api-stations", model: "aPIStation", defaultPageSize: 20 });
describePaginated({ path: "audit-logs", model: "auditLog", defaultPageSize: 20, intFilters: ["action"] });
describePaginated({ path: "benchmarks", model: "benchmark", defaultPageSize: 20, intFilters: ["verifiedStatus"] });
describePaginated({ path: "evaluations", model: "evaluation", defaultPageSize: 20, intFilters: ["status"] });
describePaginated({ path: "free-quotas", model: "userFreeQuota", defaultPageSize: 20 });
describePaginated({ path: "scripts", model: "scheduledScript", defaultPageSize: 20 });
describePaginated({ path: "sync/batches", model: "syncBatch", defaultPageSize: 20 });
describePaginated({ path: "sync/changes", model: "modelChangeLog", defaultPageSize: 20 });
describePaginated({ path: "tier-mappings", model: "userTierMapping", defaultPageSize: 20 });
describePaginated({ path: "capabilities", model: "capabilityMatrix", defaultPageSize: 50 });
describePaginated({ path: "discovery/candidates", model: "discoveryCandidate", defaultPageSize: 20 });
describePaginated({ path: "protocols", model: "protocolCompatibility", defaultPageSize: 50 });

describe("GET /api/v1/admin/intelligence/reports limit 守卫（B11-11）", () => {
  it.each(["?limit=abc", "?limit=xyz", "?limit=%20"])("%s → 400 且不调用 listReports", async (qs) => {
    const { res, json } = await callRoute("intelligence/reports", qs);
    expect(res.status).toBe(400);
    expect(json.code).toBe(40000);
    expect(listReports).not.toHaveBeenCalled();
  });

  it("正常值：limit=5 → listReports(5)；缺省 → 30；上限钳制 1000", async () => {
    await callRoute("intelligence/reports", "?limit=5");
    expect(listReports).toHaveBeenLastCalledWith(5);

    await callRoute("intelligence/reports", "");
    expect(listReports).toHaveBeenLastCalledWith(30);

    await callRoute("intelligence/reports", "?limit=99999");
    expect(listReports).toHaveBeenLastCalledWith(1000);
  });

  it("下界钳制：limit=0 / limit=-1 → 1（0/负数不会进 take）", async () => {
    await callRoute("intelligence/reports", "?limit=0");
    expect(listReports).toHaveBeenLastCalledWith(1);

    await callRoute("intelligence/reports", "?limit=-1");
    expect(listReports).toHaveBeenLastCalledWith(1);
  });
});

describe("GET /api/v1/admin/intelligence/snapshots limit 守卫（B11-11）", () => {
  it.each(["?limit=abc", "?limit=xyz", "?limit=%20"])("%s → 400 且不调用 listSnapshots", async (qs) => {
    const { res, json } = await callRoute("intelligence/snapshots", qs);
    expect(res.status).toBe(400);
    expect(json.code).toBe(40000);
    expect(listSnapshots).not.toHaveBeenCalled();
  });

  it("正常值：limit=5 → listSnapshots(5)；缺省 → 30；上限钳制 1000", async () => {
    await callRoute("intelligence/snapshots", "?limit=5");
    expect(listSnapshots).toHaveBeenLastCalledWith(5);

    await callRoute("intelligence/snapshots", "");
    expect(listSnapshots).toHaveBeenLastCalledWith(30);

    await callRoute("intelligence/snapshots", "?limit=99999");
    expect(listSnapshots).toHaveBeenLastCalledWith(1000);
  });

  it("下界钳制：limit=0 / limit=-1 → 1（0/负数不会进 take）", async () => {
    await callRoute("intelligence/snapshots", "?limit=0");
    expect(listSnapshots).toHaveBeenLastCalledWith(1);

    await callRoute("intelligence/snapshots", "?limit=-1");
    expect(listSnapshots).toHaveBeenLastCalledWith(1);
  });
});
