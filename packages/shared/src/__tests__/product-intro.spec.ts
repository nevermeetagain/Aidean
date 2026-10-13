// ProductIntroSchema 边界（add-subplatform-showcase-pages SubTask 1.1.2）：
// url 协议白名单、条数/长度上限、默认值填充。
import { describe, expect, it } from "vitest";

import { AdminProductCreateSchema, ProductIntroSchema } from "../schemas/admin.schema";

const validLink = { label: "GitHub 仓库", url: "https://github.com/aideanew/AideanFleet", kind: "repo" };

describe("ProductIntroSchema", () => {
  it("接受合法的 v1 介绍块并填充默认值", () => {
    const parsed = ProductIntroSchema.parse({ links: [validLink], facts: [{ group: "技术栈", items: [{ label: "后端", value: "Python FastAPI" }] }] });
    expect(parsed.version).toBe(1);
    expect(parsed.links[0]?.kind).toBe("repo");
  });

  it("缺省 links/facts 时默认为空数组", () => {
    const parsed = ProductIntroSchema.parse({});
    expect(parsed.links).toEqual([]);
    expect(parsed.facts).toEqual([]);
  });

  it("拒绝 javascript: 协议", () => {
    const r = ProductIntroSchema.safeParse({ links: [{ label: "x", url: "javascript:alert(1)" }] });
    expect(r.success).toBe(false);
  });

  it("拒绝 data: 协议与非法 URL", () => {
    expect(ProductIntroSchema.safeParse({ links: [{ label: "x", url: "data:text/html;base64,PHNjcmlwdD4=" }] }).success).toBe(false);
    expect(ProductIntroSchema.safeParse({ links: [{ label: "x", url: "not-a-url" }] }).success).toBe(false);
  });

  it("接受 http（内网联调地址场景）", () => {
    expect(ProductIntroSchema.safeParse({ links: [{ label: "内网", url: "http://localhost:3333" }] }).success).toBe(true);
  });

  it("链接超过 6 条拒绝", () => {
    const links = Array.from({ length: 7 }, (_, i) => ({ ...validLink, label: `L${i}` }));
    expect(ProductIntroSchema.safeParse({ links }).success).toBe(false);
  });

  it("facts 分组超 6 组、组内条目超 12 条拒绝", () => {
    const groups = Array.from({ length: 7 }, (_, i) => ({ group: `G${i}`, items: [{ label: "a", value: "b" }] }));
    expect(ProductIntroSchema.safeParse({ facts: groups }).success).toBe(false);
    const items = Array.from({ length: 13 }, (_, i) => ({ label: `l${i}`, value: "v" }));
    expect(ProductIntroSchema.safeParse({ facts: [{ group: "G", items }] }).success).toBe(false);
  });

  it("label 超 20 字拒绝", () => {
    expect(ProductIntroSchema.safeParse({ links: [{ label: "标".repeat(21), url: "https://a.cn" }] }).success).toBe(false);
  });

  it("nullish：产品创建允许 intro 为 null/缺省，非法结构拒绝", () => {
    const base = { slug: "demo", name: "Demo" };
    expect(AdminProductCreateSchema.safeParse(base).success).toBe(true);
    expect(AdminProductCreateSchema.safeParse({ ...base, intro: null }).success).toBe(true);
    expect(AdminProductCreateSchema.safeParse({ ...base, intro: { links: [{ label: "x", url: "javascript:x" }] } }).success).toBe(false);
  });
});

// ==================== v2 三层介绍区块（enrich-subplatform-intro-pages SubTask 1.1.2） ====================
// 覆盖：v1 存量兼容（零迁移）、v2 字段解析、缺省即不渲染、条数/长度上限、version 域。

describe("ProductIntroSchema v2 · 向后兼容", () => {
  const v1Stored = {
    version: 1,
    links: [validLink],
    facts: [{ group: "交付", items: [{ label: "交付形态", value: "Docker Compose 全栈部署" }] }],
  };

  it("库内 v1 JSON 在 v2 契约下原样解析（读侧零迁移承诺）", () => {
    const r = ProductIntroSchema.safeParse(v1Stored);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.version).toBe(1);
      expect(r.data.audience).toBeUndefined();
      expect(r.data.problems).toBeUndefined();
      expect(r.data.workflow).toBeUndefined();
      expect(r.data.promises).toBeUndefined();
      expect(r.data.ecosystem).toBeUndefined();
    }
  });

  it("version:2 且 v2 区块全部缺省合法（可选即零渲染）", () => {
    expect(ProductIntroSchema.safeParse({ ...v1Stored, version: 2 }).success).toBe(true);
  });

  it("version 非 1/2 拒绝", () => {
    expect(ProductIntroSchema.safeParse({ ...v1Stored, version: 3 }).success).toBe(false);
    expect(ProductIntroSchema.safeParse({ ...v1Stored, version: 0 }).success).toBe(false);
  });

  it("未知键 strip（v2 契约不因多余键失败，也不带病入库）", () => {
    const r = ProductIntroSchema.safeParse({ ...v1Stored, futureField: "x" });
    expect(r.success).toBe(true);
    if (r.success) expect((r.data as Record<string, unknown>).futureField).toBeUndefined();
  });
});

describe("ProductIntroSchema v2 · 区块解析与上限", () => {
  const v2Full = {
    version: 2,
    links: [validLink],
    facts: [],
    audience: "需要长期沉淀公众号内容并检索复用的人群",
    problems: [
      { problem: "文章散在收藏里找不回", solution: "链接发给机器人即入库，检索问答直达原文" },
      { problem: "账号更新后副本过期", solution: "订阅全量文章增量自动同步" },
    ],
    workflow: { title: "从链接到可用知识库", steps: ["发送链接", "选择订阅策略", "后台解析入库", "随时问答带出处"] },
    promises: ["全栈私有部署，数据自持", "敏感凭据加密落库"],
    ecosystem: ["主平台账号统一登录", "统一计费网关已接入"],
  };

  it("v2 全量区块解析并保真", () => {
    const r = ProductIntroSchema.parse(v2Full);
    expect(r.version).toBe(2);
    expect(r.problems).toHaveLength(2);
    expect(r.workflow?.steps).toHaveLength(4);
    expect(r.promises).toHaveLength(2);
    expect(r.ecosystem).toHaveLength(2);
  });

  it("audience 超 80 字拒绝", () => {
    expect(ProductIntroSchema.safeParse({ ...v2Full, audience: "字".repeat(81) }).success).toBe(false);
  });

  it("problems 超 4 条 / 单条空题 / solution 超 200 字拒绝", () => {
    const five = Array.from({ length: 5 }, (_, i) => ({ problem: `p${i}`, solution: "s" }));
    expect(ProductIntroSchema.safeParse({ ...v2Full, problems: five }).success).toBe(false);
    expect(ProductIntroSchema.safeParse({ ...v2Full, problems: [{ problem: "", solution: "s" }] }).success).toBe(false);
    expect(ProductIntroSchema.safeParse({ ...v2Full, problems: [{ problem: "p".repeat(81), solution: "s" }] }).success).toBe(false);
    expect(ProductIntroSchema.safeParse({ ...v2Full, problems: [{ problem: "p", solution: "s".repeat(201) }] }).success).toBe(false);
  });

  it("workflow 缺题 / 空步骤 / 超 8 步 / 单步超 120 字拒绝", () => {
    expect(ProductIntroSchema.safeParse({ ...v2Full, workflow: { title: "", steps: ["x"] } }).success).toBe(false);
    expect(ProductIntroSchema.safeParse({ ...v2Full, workflow: { title: "t", steps: [] } }).success).toBe(false);
    const nine = Array.from({ length: 9 }, (_, i) => `step${i}`);
    expect(ProductIntroSchema.safeParse({ ...v2Full, workflow: { title: "t", steps: nine } }).success).toBe(false);
    expect(ProductIntroSchema.safeParse({ ...v2Full, workflow: { title: "t", steps: ["步".repeat(121)] } }).success).toBe(false);
  });

  it("promises/ecosystem 超 4 条或空数组拒绝；合法 1–4 条通过", () => {
    expect(ProductIntroSchema.safeParse({ ...v2Full, promises: ["a", "b", "c", "d", "e"] }).success).toBe(false);
    expect(ProductIntroSchema.safeParse({ ...v2Full, ecosystem: [] }).success).toBe(false);
    expect(ProductIntroSchema.safeParse({ ...v2Full, ecosystem: ["x"] }).success).toBe(true);
  });

  it("AdminProductCreateSchema 可落 v2 intro", () => {
    const r = AdminProductCreateSchema.safeParse({ slug: "p2", name: "P2", intro: v2Full });
    expect(r.success).toBe(true);
  });
});
