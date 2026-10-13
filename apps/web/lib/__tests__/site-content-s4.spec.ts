/**
 * S4「站点可见即可改」读服务 + 新增值规则单测（无需 DB / Next 运行上下文）。
 * 覆盖：site/home/docs 读服务在「有值 / 缺行 / DB 抛错」三态下的回退；
 *      generateMetadata 标题拼装；homeHero/homeCards/docsArticles 值规则校验（默认串通过、非法拒绝）。
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
vi.mock("../db/prisma", () => ({ prisma: {} }));

import {
  loadSiteBranding,
  buildDocumentTitle,
  SITE_BRANDING_DEFAULT,
} from "../site-config";
import { loadHomeContent } from "../features/home/config";
import { loadDocsArticles } from "../features/docs/config";
import {
  normalizeConfigValue,
  ADMIN_CONFIG_REGISTRY,
  HOME_HERO_DEFAULT,
  DOCS_ARTICLES_DEFAULT,
  parseHomeHero,
  parseHomeCards,
  parseDocsArticles,
  docsGroupsOf,
  HOME_VALUE_POINTS_DEFAULT,
} from "@aidean/shared";

const entry = (key: string) => ADMIN_CONFIG_REGISTRY.find((e) => e.configKey === key)!;

/** 构造仅含 systemConfig 的假 PrismaClient */
function fakeClient(sysCfg: Record<string, unknown>) {
  return { systemConfig: sysCfg } as never;
}

describe("lib/site-config loadSiteBranding", () => {
  it("读到 site.* 行时逐键应用", async () => {
    const rows = [
      { configKey: "site.name", configValue: "新品牌" },
      { configKey: "site.description", configValue: "更好的描述" },
      { configKey: "site.title", configValue: "独立标题" },
      { configKey: "site.seo.keywords", configValue: "a, b, c" },
    ];
    const b = await loadSiteBranding(fakeClient({ findMany: async () => rows }));
    expect(b.name).toBe("新品牌");
    expect(b.description).toBe("更好的描述");
    expect(b.title).toBe("独立标题");
    expect(b.keywords).toBe("a, b, c");
  });

  it("缺行的键回退默认，空串 title 承载为可空", async () => {
    const b = await loadSiteBranding(fakeClient({ findMany: async () => [{ configKey: "site.name", configValue: "只改名" }] }));
    expect(b.name).toBe("只改名");
    expect(b.description).toBe(SITE_BRANDING_DEFAULT.description);
    expect(b.title).toBe("");
    expect(b.logoUrl).toBe(SITE_BRANDING_DEFAULT.logoUrl);
  });

  it("DB 抛错时全量回退默认（不白屏）", async () => {
    const b = await loadSiteBranding(fakeClient({ findMany: async () => { throw new Error("db down"); } }));
    expect(b).toEqual(SITE_BRANDING_DEFAULT);
  });

  it("buildDocumentTitle：site.title 优先，空则「名 · 描述」", () => {
    expect(buildDocumentTitle({ ...SITE_BRANDING_DEFAULT, title: "自定义" })).toBe("自定义");
    expect(buildDocumentTitle({ ...SITE_BRANDING_DEFAULT, title: "", name: "Aidean", description: "平台" })).toBe("Aidean · 平台");
  });
});

describe("lib/features/home loadHomeContent", () => {
  const heroJson = '{"badge":"B","title":"TT","subtitle":"SS","primaryCta":{"href":"/x","label":"L1"},"secondaryCta":{"href":"/y","label":"L2"},"stats":[{"value":"v","label":"l"}]}';
  it("读到 home.* 三键时解析生效", async () => {
    const rows = [
      { configKey: "home.hero", configValue: heroJson },
      { configKey: "home.valuePoints", configValue: '[{"icon":"Zap","title":"t","description":"d"}]' },
      { configKey: "home.modelEntries", configValue: '[{"icon":"Trophy","title":"t","description":"d","href":"/models"}]' },
    ];
    const c = await loadHomeContent(fakeClient({ findMany: async () => rows }));
    expect(c.hero.title).toBe("TT");
    expect(c.valuePoints[0]).toMatchObject({ icon: "Zap", title: "t" });
    expect(c.modelEntries[0]?.href).toBe("/models");
  });

  it("非法 JSON / 缺行 / DB 抛错一律回退原文案默认", async () => {
    const bad = await loadHomeContent(fakeClient({ findMany: async () => [{ configKey: "home.hero", configValue: "{bad json" }] }));
    expect(bad.hero.title).toBe(HOME_HERO_DEFAULT.title);
    const thrown = await loadHomeContent(fakeClient({ findMany: async () => { throw new Error("db down"); } }));
    expect(thrown.valuePoints).toEqual(HOME_VALUE_POINTS_DEFAULT);
    expect(thrown.hero.stats).toHaveLength(HOME_HERO_DEFAULT.stats.length);
  });
});

describe("lib/features/docs loadDocsArticles", () => {
  it("读到合法 docs.articles 时解析", async () => {
    const one = [{ id: "x", group: "G", title: "T", summary: "S", sections: [{ title: "s", text: "t" }], link: "/l", linkLabel: "LL" }];
    const a = await loadDocsArticles(fakeClient({ findUnique: async () => ({ configValue: JSON.stringify(one) }) }));
    expect(a).toHaveLength(1);
    expect(a[0]?.title).toBe("T");
  });

  it("缺行 / 非法 / DB 抛错回退默认 6 篇", async () => {
    expect(await loadDocsArticles(fakeClient({ findUnique: async () => null }))).toHaveLength(DOCS_ARTICLES_DEFAULT.length);
    expect(await loadDocsArticles(fakeClient({ findUnique: async () => ({ configValue: "nope" }) }))).toHaveLength(DOCS_ARTICLES_DEFAULT.length);
    expect(await loadDocsArticles(fakeClient({ findUnique: async () => { throw new Error("db down"); } }))).toHaveLength(DOCS_ARTICLES_DEFAULT.length);
  });
});

describe("S4 新增 valueRule 校验", () => {
  it("homeHero/homeCards/docsArticles 默认规范串均通过（存原文，供 seed 逐字符一致）", () => {
    for (const key of ["home.hero", "home.valuePoints", "home.modelEntries", "docs.articles"]) {
      const e = entry(key);
      expect(normalizeConfigValue(e, e.defaultValue), key).toEqual({ ok: true, value: e.defaultValue });
    }
  });

  it("homeHero 非法 JSON / 未知图标 拒绝", () => {
    expect(normalizeConfigValue(entry("home.hero"), "{bad").ok).toBe(false);
    expect(normalizeConfigValue(entry("home.valuePoints"), '[{"icon":"Nope","title":"t","description":"d"}]').ok).toBe(false);
    expect(normalizeConfigValue(entry("home.modelEntries"), "[]").ok).toBe(false); // min(1)
  });

  it("docsArticles 缺必填字段拒绝、合法通过", () => {
    expect(normalizeConfigValue(entry("docs.articles"), '[{"id":"x"}]').ok).toBe(false);
    const ok = [{ id: "x", group: "G", title: "T", summary: "S", sections: [{ title: "s", text: "t" }], link: "/l", linkLabel: "LL" }];
    expect(normalizeConfigValue(entry("docs.articles"), JSON.stringify(ok)).ok).toBe(true);
  });
});

describe("shared 解析兜底纯函数", () => {
  it("parseHomeHero 非法回退默认、parseHomeCards 用传入 fallback", () => {
    expect(parseHomeHero(undefined).title).toBe(HOME_HERO_DEFAULT.title);
    expect(parseHomeCards(undefined, HOME_VALUE_POINTS_DEFAULT)).toEqual(HOME_VALUE_POINTS_DEFAULT);
  });
  it("parseDocsArticles 非法回退默认；docsGroupsOf 按首现顺序去重", () => {
    expect(parseDocsArticles("bad")).toHaveLength(DOCS_ARTICLES_DEFAULT.length);
    expect(docsGroupsOf(DOCS_ARTICLES_DEFAULT)).toEqual(["开始使用", "开发者接入", "使用与支持"]);
  });
});
