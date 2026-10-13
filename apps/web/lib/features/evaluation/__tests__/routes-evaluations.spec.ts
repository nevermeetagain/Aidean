/**
 * evaluation 域 API 路由测试（EVAL-01 P4：四端点状态码/信封/分页/越权）。
 * 策略：内存 Request 直调 withApi 包装后的 handler；vi.mock auth/session 与 evaluation/service。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { sessionMock, serviceMock } = vi.hoisted(() => ({
  sessionMock: { requireUserApi: vi.fn() },
  serviceMock: {
    createAndRun: vi.fn(),
    getMyEvaluations: vi.fn(),
    getEvaluation: vi.fn(),
    getDemoEvaluations: vi.fn(),
  },
}));

vi.mock("../../../../lib/features/auth/session", () => sessionMock);
vi.mock("../../../../lib/features/evaluation/service", () => ({ evaluationService: serviceMock }));

import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";
import { POST as PostEvaluations, GET as GetEvaluations } from "../../../../app/api/v1/evaluations/route";
import { GET as GetDemo } from "../../../../app/api/v1/evaluations/demo/route";
import { GET as GetById } from "../../../../app/api/v1/evaluations/[id]/route";

const SESSION_PRO = { userId: "u-1", tier: "PRO" };
const SESSION_NORMAL = { userId: "u-1", tier: "NORMAL" };

function jsonResponse(r: Response): Promise<any> {
  return r.json();
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.requireUserApi.mockResolvedValue(SESSION_PRO);
});

describe("POST /api/v1/evaluations", () => {
  it("① 未登录 → 401（requireUserApi 抛 10004）", async () => {
    sessionMock.requireUserApi.mockRejectedValue(new ApiError(ERROR_CODES.UNAUTHENTICATED, "请先登录"));
    const res = await PostEvaluations(
      new Request("http://localhost/api/v1/evaluations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: "x", modelIds: ["m-1", "m-2"] }),
      })
    );
    expect(res.status).toBe(401);
    const body = await jsonResponse(res);
    expect(body.code).toBe(ERROR_CODES.UNAUTHENTICATED);
    expect(body.data).toBeNull();
    expect(serviceMock.createAndRun).not.toHaveBeenCalled();
  });

  it("② 免费用户（NORMAL）→ service 抛 403 付费用户能力", async () => {
    sessionMock.requireUserApi.mockResolvedValue(SESSION_NORMAL);
    serviceMock.createAndRun.mockRejectedValue(new ApiError(ERROR_CODES.FORBIDDEN, "对比测评为付费用户能力"));
    const res = await PostEvaluations(
      new Request("http://localhost/api/v1/evaluations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: "x", modelIds: ["m-1", "m-2"] }),
      })
    );
    expect(res.status).toBe(403);
  });

  it("③ 参数非法（模型数 1）→ 40000 信封，不触 service", async () => {
    const res = await PostEvaluations(
      new Request("http://localhost/api/v1/evaluations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: "x", modelIds: ["m-1"] }),
      })
    );
    expect(res.status).toBe(400);
    const body = await jsonResponse(res);
    expect(body.code).toBe(ERROR_CODES.BAD_REQUEST);
    expect(serviceMock.createAndRun).not.toHaveBeenCalled();
  });

  it("④ 创建成功 → 信封 {evaluation, idempotent}；tier 与幂等键透传", async () => {
    serviceMock.createAndRun.mockResolvedValue({ evaluation: { id: "ev-1" }, idempotent: false });
    const res = await PostEvaluations(
      new Request("http://localhost/api/v1/evaluations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: "比较一下", modelIds: ["m-1", "m-2"], idempotencyKey: "k-1" }),
      })
    );
    expect(res.status).toBe(200);
    const body = await jsonResponse(res);
    expect(body.code).toBe(0);
    expect(body.data.evaluation.id).toBe("ev-1");
    expect(body.data.idempotent).toBe(false);
    expect(serviceMock.createAndRun).toHaveBeenCalledWith("u-1", "PRO", {
      prompt: "比较一下",
      modelIds: ["m-1", "m-2"],
      idempotencyKey: "k-1",
    });
  });
});

describe("GET /api/v1/evaluations（我的分页）", () => {
  it("⑤ 分页参数合法 → 信封 rows/total/page/pageSize", async () => {
    serviceMock.getMyEvaluations.mockResolvedValue({ rows: [{ id: "ev-1" }], total: 1, page: 1, pageSize: 10 });
    const res = await GetEvaluations(new Request("http://localhost/api/v1/evaluations?page=1&pageSize=10"));
    const body = await jsonResponse(res);
    expect(body.code).toBe(0);
    expect(body.data.rows).toHaveLength(1);
    expect(serviceMock.getMyEvaluations).toHaveBeenCalledWith("u-1", 1, 10);
  });

  it("⑥ 非法分页（page=0）→ 40000", async () => {
    const res = await GetEvaluations(new Request("http://localhost/api/v1/evaluations?page=0"));
    expect(res.status).toBe(400);
    const body = await jsonResponse(res);
    expect(body.code).toBe(ERROR_CODES.BAD_REQUEST);
    expect(serviceMock.getMyEvaluations).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/evaluations/demo", () => {
  it("⑦ 公开示例（未登录也可访问：不调 requireUserApi）→ 信封 items", async () => {
    serviceMock.getDemoEvaluations.mockResolvedValue([{ id: "demo-1" }]);
    const res = await GetDemo(new Request("http://localhost/api/v1/evaluations/demo"));
    expect(res.status).toBe(200);
    const body = await jsonResponse(res);
    expect(body.data.items).toHaveLength(1);
    expect(serviceMock.getDemoEvaluations).toHaveBeenCalledWith(3);
  });

  it("⑧ limit 越界 → 40000（RW-3 契约统一：显式非法参数拒绝而非静默收敛，与 parseEvaluationPage/G6 E6 同口径）", async () => {
    serviceMock.getDemoEvaluations.mockResolvedValue([]);
    const res = await GetDemo(new Request("http://localhost/api/v1/evaluations/demo?limit=999"));
    expect(res.status).toBe(400);
    expect((await jsonResponse(res)).code).toBe(40000);
    expect(serviceMock.getDemoEvaluations).not.toHaveBeenCalled();
  });

  it("⑧b limit 合法（1..10）透传原值；空串按缺省 3", async () => {
    serviceMock.getDemoEvaluations.mockResolvedValue([]);
    await GetDemo(new Request("http://localhost/api/v1/evaluations/demo?limit=7"));
    expect(serviceMock.getDemoEvaluations).toHaveBeenCalledWith(7);
    await GetDemo(new Request("http://localhost/api/v1/evaluations/demo?limit="));
    expect(serviceMock.getDemoEvaluations).toHaveBeenLastCalledWith(3);
  });
});

describe("GET /api/v1/evaluations/[id]", () => {
  it("⑨ 本人单 → 信封 evaluation；demo 单（isPaid=false）他人可见", async () => {
    serviceMock.getEvaluation.mockResolvedValue({ id: "ev-1", isPaid: true });
    const res = await GetById(new Request("http://localhost/api/v1/evaluations/ev-1"), { params: Promise.resolve({ id: "ev-1" }) });
    const body = await jsonResponse(res);
    expect(body.code).toBe(0);
    expect(body.data.evaluation.id).toBe("ev-1");
    expect(serviceMock.getEvaluation).toHaveBeenCalledWith("u-1", "ev-1");
  });

  it("⑩ 越权访问他人付费单 → service 抛 403 → 403 信封", async () => {
    serviceMock.getEvaluation.mockRejectedValue(new ApiError(ERROR_CODES.FORBIDDEN, "无权查看该测评"));
    const res = await GetById(new Request("http://localhost/api/v1/evaluations/ev-other"), { params: Promise.resolve({ id: "ev-other" }) });
    expect(res.status).toBe(403);
    const body = await jsonResponse(res);
    expect(body.code).toBe(ERROR_CODES.FORBIDDEN);
  });

  it("⑪ 单不存在 → 40000", async () => {
    serviceMock.getEvaluation.mockRejectedValue(new ApiError(ERROR_CODES.BAD_REQUEST, "测评不存在"));
    const res = await GetById(new Request("http://localhost/api/v1/evaluations/ev-missing"), { params: Promise.resolve({ id: "ev-missing" }) });
    expect(res.status).toBe(400);
    const body = await jsonResponse(res);
    expect(body.code).toBe(ERROR_CODES.BAD_REQUEST);
  });
});
