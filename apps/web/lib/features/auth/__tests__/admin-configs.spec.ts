/**
 * /api/v1/admin/configs 通用键值契约（P2）。
 * 覆盖：GET 白名单合并投影（缺行回退默认）；PUT ladder 键分派 clamp→落库→审计；白名单外键 → 40000；
 * NUMBER 键传非数值字符串 → 40000；守卫 403；milestones 键 JSON 归一化/非法/超限拒绝。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const guardStub = vi.hoisted(() => ({ requireAdminApi: vi.fn() }));
const prismaState = vi.hoisted(() => ({
  systemConfig: { findMany: vi.fn(), upsert: vi.fn() },
}));
const ladderStub = vi.hoisted(() => ({
  getLadderGranularity: vi.fn(),
  setLadderGranularity: vi.fn(),
}));
const auditStub = vi.hoisted(() => ({ writeAudit: vi.fn() }));

vi.mock("../session", () => guardStub);
vi.mock("../../../db/prisma", () => ({ prisma: prismaState }));
vi.mock("../../../features/ladder/config", () => ladderStub);
vi.mock("../../../../app/api/v1/_lib/audit", () => auditStub);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

import { ApiError, ERROR_CODES } from "../../../../app/api/v1/_lib/errors";
import { ADMIN_CONFIG_REGISTRY, normalizeConfigValue } from "@aidean/shared";

const configsRoute = await import("../../../../app/api/v1/admin/configs/route");

const SESSION_OK = { userId: "u-admin", tier: "PRO" };
const FORBID = () => new ApiError(ERROR_CODES.FORBIDDEN, "需要管理员权限");

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/v1/admin/configs", () => {
  it("① 放行 + 库内缺行 → 白名单键回退默认值（ladder 0.1），含元信息", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.systemConfig.findMany.mockResolvedValueOnce([]);
    const res = await configsRoute.GET(new Request("http://localhost/api/v1/admin/configs"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    // 白名单扩容至 24 键（ladder + site.* 6 项 + pricing.* 2 项 + security.* 3 项 + about.* 2 项 + roadmap 1 项 + partners.* 3 项 + home.* 3 项 + docs.* 1 项 + S8 partners.marquee/about.body 2 项），registry 顺序稳定：ladder 居首，S4/S8 新键追加在后
    expect(body.data.configs).toHaveLength(24);
    expect(body.data.configs[0]).toMatchObject({
      configKey: "ladder_score_granularity",
      configType: "NUMBER",
      configValue: "0.1",
      defaultValue: "0.1",
      updatedAt: null,
    });
    expect(body.data.configs.map((c: { configKey: string }) => c.configKey)).toEqual([
      "ladder_score_granularity",
      "site.name",
      "site.description",
      "site.logoUrl",
      "site.title",
      "site.faviconUrl",
      "pricing.evalPerModel",
      "pricing.currency",
      "security.accessTokenTtlMinutes",
      "security.refreshTokenTtlDays",
      "security.maxLoginAttempts",
      "about.contactEmail",
      "about.wechatQrUrl",
      "roadmap.milestones",
      "partners.education",
      "partners.paper",
      "partners.research",
      "site.seo.keywords",
      "home.hero",
      "home.valuePoints",
      "home.modelEntries",
      "docs.articles",
      "partners.marquee",
      "about.body",
    ]);
    expect(body.data.configs[1]).toMatchObject({
      configKey: "site.name",
      configType: "STRING",
      configValue: "Aidean",
      defaultValue: "Aidean",
    });
    expect(prismaState.systemConfig.findMany.mock.calls[0][0].where.configKey.in).toContain(
      "ladder_score_granularity"
    );
  });

  it("② 放行 + 库内有行 → configValue 取库值 + updatedAt 投影", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.systemConfig.findMany.mockResolvedValueOnce([
      {
        configKey: "ladder_score_granularity",
        configValue: "0.2",
        updatedAt: new Date("2026-09-09T00:00:00.000Z"),
      },
    ]);
    const res = await configsRoute.GET(new Request("http://localhost/api/v1/admin/configs"));
    const body = await res.json();
    expect(body.data.configs[0].configValue).toBe("0.2");
    expect(body.data.configs[0].updatedAt).toBe("2026-09-09T00:00:00.000Z");
  });
});

describe("PUT /api/v1/admin/configs", () => {
  it("③ ladder 键 0.2 → clamp/落库 + AuditLog(action=2, recordId=configKey)", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    ladderStub.setLadderGranularity.mockResolvedValueOnce(0.2);
    const res = await configsRoute.PUT(
      new Request("http://localhost/api/v1/admin/configs", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ configKey: "ladder_score_granularity", configValue: 0.2 }),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.config).toEqual({
      configKey: "ladder_score_granularity",
      configType: "NUMBER",
      configValue: "0.2",
    });
    expect(ladderStub.setLadderGranularity).toHaveBeenCalledWith(0.2);
    expect(auditStub.writeAudit.mock.calls[0][0]).toMatchObject({
      tableName: "system_configs",
      recordId: "ladder_score_granularity",
      action: 2,
      changedFields: ["configValue"],
    });
  });

  it("④ 白名单外键 → 400 code=40000（枚举文案中文化），不触 ladder", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    const res = await configsRoute.PUT(
      new Request("http://localhost/api/v1/admin/configs", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ configKey: "site_name", configValue: "x" }),
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe(40000);
    expect(body.message).toContain("允许 ladder_score_granularity");
    expect(ladderStub.setLadderGranularity).not.toHaveBeenCalled();
  });

  it("⑤ ladder 键传非数值字符串 → 400 code=40000", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    const res = await configsRoute.PUT(
      new Request("http://localhost/api/v1/admin/configs", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ configKey: "ladder_score_granularity", configValue: "abc" }),
      })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe(40000);
    expect(ladderStub.setLadderGranularity).not.toHaveBeenCalled();
  });

  it("⑥ 非管理员 → 403 code=10008", async () => {
    guardStub.requireAdminApi.mockRejectedValueOnce(FORBID());
    const res = await configsRoute.PUT(
      new Request("http://localhost/api/v1/admin/configs", { method: "PUT" })
    );
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe(10008);
  });
});

describe("PUT /api/v1/admin/configs 扩容（site.* STRING 通道 + valueRule 钩子）", () => {
  const put = (payload: unknown) =>
    configsRoute.PUT(
      new Request("http://localhost/api/v1/admin/configs", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })
    );

  it("⑦ site.name STRING 写入（trim）→ upsert 落库 + audit(action=2)，不触 ladder", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.systemConfig.upsert.mockResolvedValueOnce({});
    const res = await put({ configKey: "site.name", configValue: "  新站名  " });
    expect(res.status).toBe(200);
    expect((await res.json()).data.config).toEqual({
      configKey: "site.name",
      configType: "STRING",
      configValue: "新站名",
    });
    const args = prismaState.systemConfig.upsert.mock.calls[0][0];
    expect(args.where.configKey).toBe("site.name");
    expect(args.update.configValue).toBe("新站名");
    expect(auditStub.writeAudit.mock.calls[0][0]).toMatchObject({
      tableName: "system_configs",
      recordId: "site.name",
      action: 2,
    });
    expect(ladderStub.setLadderGranularity).not.toHaveBeenCalled();
  });

  it("⑧ site.name 空串（allowEmpty=false）→ 400 code=40000「配置值不能为空」，不落库", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    const res = await put({ configKey: "site.name", configValue: "" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe(40000);
    expect(body.message).toContain("配置值不能为空");
    expect(prismaState.systemConfig.upsert).not.toHaveBeenCalled();
  });

  it("⑨ site.title 允许空串（allowEmpty=true，语义=回退站点名称）→ 200 且落库空值", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.systemConfig.upsert.mockResolvedValueOnce({});
    const res = await put({ configKey: "site.title", configValue: "" });
    expect(res.status).toBe(200);
    expect((await res.json()).data.config.configValue).toBe("");
    expect(prismaState.systemConfig.upsert.mock.calls[0][0].update.configValue).toBe("");
  });

  it("⑩ number 键 clamp 上界：999 → setLadderGranularity(10) 且回写 10", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    ladderStub.setLadderGranularity.mockResolvedValueOnce(10);
    const res = await put({ configKey: "ladder_score_granularity", configValue: 999 });
    expect(res.status).toBe(200);
    expect((await res.json()).data.config.configValue).toBe("10");
    expect(ladderStub.setLadderGranularity).toHaveBeenCalledWith(10);
  });

  it("⑪ valueRule BOOLEAN 钩子：'TRUE'→'true' 归一化；'yes'→ok:false 含「布尔」", () => {
    const boolEntry = {
      ...ADMIN_CONFIG_REGISTRY[0],
      valueRule: { kind: "boolean" as const },
    };
    expect(normalizeConfigValue(boolEntry, "TRUE")).toEqual({ ok: true, value: "true" });
    expect(normalizeConfigValue(boolEntry, "False")).toEqual({ ok: true, value: "false" });
    const bad = normalizeConfigValue(boolEntry, "yes");
    expect(bad.ok).toBe(false);
    expect(bad.ok === false && bad.message).toContain("布尔配置值仅允许 true/false");
  });

  it("⑬ pricing.evalPerModel NUMBER clamp 上界：99999 → 9999（一期二期同 clamp 口径）", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.systemConfig.upsert.mockResolvedValueOnce({});
    const res = await put({ configKey: "pricing.evalPerModel", configValue: 99999 });
    expect(res.status).toBe(200);
    expect((await res.json()).data.config.configValue).toBe("9999");
    expect(prismaState.systemConfig.upsert.mock.calls[0][0].update.configValue).toBe("9999");
  });

  it("⑭ pricing.currency 枚举外值 XXX → 40000 含「允许 CNY/USD」，不落库", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    const res = await put({ configKey: "pricing.currency", configValue: "XXX" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe(40000);
    expect(body.message).toContain("允许 CNY/USD");
    expect(prismaState.systemConfig.upsert).not.toHaveBeenCalled();
  });

  it("⑮ pricing.currency 合法枚举 USD → 200 落库 + audit(action=2)", async () => {
    guardStub.requireAdminApi.mockResolvedValueOnce(SESSION_OK);
    prismaState.systemConfig.upsert.mockResolvedValueOnce({});
    const res = await put({ configKey: "pricing.currency", configValue: "USD" });
    expect(res.status).toBe(200);
    expect((await res.json()).data.config.configValue).toBe("USD");
    expect(auditStub.writeAudit.mock.calls[0][0]).toMatchObject({
      tableName: "system_configs",
      recordId: "pricing.currency",
      action: 2,
    });
  });

  it("⑯ valueRule string 长度钩子（201 字）→ ok:false 含「配置值长度超出上限」", () => {
    const strEntry = ADMIN_CONFIG_REGISTRY[1];
    expect(strEntry.configKey).toBe("site.name");
    const tooLong = normalizeConfigValue(strEntry, "x".repeat(201));
    expect(tooLong.ok).toBe(false);
    expect(tooLong.ok === false && tooLong.message).toContain("配置值长度超出上限");
    const ok200 = normalizeConfigValue(strEntry, "x".repeat(200));
    expect(ok200.ok).toBe(true);
    expect(ok200.ok === true && ok200.value).toHaveLength(200);
  });
});
