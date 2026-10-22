import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { HOME_MODEL_ENTRIES_DEFAULT } from "@aidean/shared";
import { describe, expect, it } from "vitest";
import { NAV_ITEMS } from "./navigation";
import { PRODUCT_FALLBACK } from "./product-fallback";
import { PRODUCT_CATEGORY_LABELS, PRODUCT_CATEGORY_ORDER, productCategoryLabel } from "./product-label";

/**
 * #71 导航 ↔ 产品底稿一致性护栏：
 * 导航是硬编码常量、产品在 DB——两侧漂移无测试兜底就会各说各话
 * （先例债：wechatrag↔AideanBot 映射靠 spec 文档人工登记）。
 * 产品子项的 slug 必须能在统一底稿中找到（底稿与 seed §6 同源同步契约）。
 * #73 双向护栏：新增产品（进底稿/seed）忘改导航即红；分类标签集合唯一来源 lib/product-label.ts。
 */
describe("navigation ↔ products 一致性（#71/#73）", () => {
  const products = NAV_ITEMS.find((n) => n.key === "products");
  const slugs = new Set(PRODUCT_FALLBACK.map((f) => f.slug));
  const hrefs = new Set((products?.children ?? []).map((c) => c.href));
  // 分类标签集合 = 已命名分类 + 未分类归口的「其它」，全部来自 product-label.ts 单一来源
  const knownGroups = new Set([...Object.values(PRODUCT_CATEGORY_LABELS), productCategoryLabel(null)]);

  it("产品下拉子项非空且有序", () => {
    expect(products?.children?.length ?? 0).toBeGreaterThanOrEqual(6);
  });

  it("每个产品介绍页子项的 slug 底稿可达", () => {
    for (const child of products?.children ?? []) {
      const m = child.href.match(/^\/products\/([a-z0-9-]+)$/);
      if (!m) continue; // /models、/providers、/ladder 等主站服务入口非产品 slug
      expect(slugs.has(m[1]), `href ${child.href} 的 slug 不在统一底稿`).toBe(true);
      expect(child.label.length, `子项 ${child.key} label 非空`).toBeGreaterThan(0);
    }
  });

  it("底稿内每个产品都有导航入口（反向护栏：新增产品忘改导航即红）", () => {
    for (const f of PRODUCT_FALLBACK) {
      expect(hrefs.has(`/products/${f.slug}`), `底稿产品 ${f.slug} 缺导航入口`).toBe(true);
    }
  });

  it("导航分组值属于已知二级分类标签集", () => {
    for (const child of products?.children ?? []) {
      if (child.group) {
        expect(knownGroups.has(child.group), `未知分组 ${child.group}`).toBe(true);
      }
    }
  });

  it("组序契约：主站服务入口在前，分类组按 PRODUCT_CATEGORY_ORDER 依次出现且不交错", () => {
    const children = products?.children ?? [];
    const groups = children.map((c) => c.group ?? "");
    const first = (g: string) => groups.findIndex((x) => x === g);

    // 模型天梯图 / 模型服务提供商 / 云服务天梯图是主站服务，必须排在所有分类组之前
    const serviceIdx = children.findIndex((c) => c.href === "/models");
    expect(serviceIdx).toBeGreaterThanOrEqual(0);
    expect(children[serviceIdx + 1]?.href).toBe("/providers");
    // UX-17：云服务天梯图 /ladder 作为第三个主站服务入口（不进分类组）
    expect(children[serviceIdx + 2]?.href).toBe("/ladder");
    expect(children[serviceIdx + 2]?.group).toBeUndefined();
    expect(first(productCategoryLabel(PRODUCT_CATEGORY_ORDER[0]))).toBeGreaterThan(serviceIdx + 2);

    // 分类组严格按 PRODUCT_CATEGORY_ORDER 出现（含未分类归口的「其它」置末）
    let prev = serviceIdx + 2;
    for (const cat of PRODUCT_CATEGORY_ORDER) {
      const label = productCategoryLabel(cat);
      const i = first(label);
      expect(i, `缺分类组 ${label}`).toBeGreaterThanOrEqual(0);
      expect(i, `分类组顺序错误：${label} 未在 ${prev + 1} 之后`).toBeGreaterThan(prev);
      prev = i;
    }

    // 同一分类的子项必须连续（不交错）
    for (const cat of PRODUCT_CATEGORY_ORDER) {
      const label = productCategoryLabel(cat);
      const idxs = groups.map((g, i) => (g === label ? i : -1)).filter((i) => i >= 0);
      if (idxs.length > 1) {
        expect(idxs[idxs.length - 1] - idxs[0] + 1, `分类 ${label} 子项交错`).toBe(idxs.length);
      }
    }
  });
});

/**
 * UX-FIX-A（EVD-UX-01 批次 A：用户端外壳与版式）源码级护栏（并入本文件以免新增 spec 文件改动 docs facts 的 spec-count 锚）。
 * 运行态/截图复测由主线统一做；此处只锁住「断点同步、容器宽度、H1 刻度、对比度令牌、占位符、入口指向」
 * 这些一旦回退就会让 768 溢出 / 对比度不达标等问题静默复发的源码契约。
 */
const web = resolve(__dirname, "..");
const src = (p: string) => readFileSync(resolve(web, p), "utf8");

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("UX-01 页头断点 md→xl（<1280 走抽屉）", () => {
  const header = src("components/site/SiteHeader.tsx");
  const mobile = src("components/site/MobileNav.tsx");

  it("桌面导航与搜索在 xl 才展开，不再用 md:flex / md:block", () => {
    expect(header).toMatch(/aria-label="主导航" className="hidden items-center gap-0\.5 xl:flex"/);
    expect(header).toMatch(/<div className="hidden xl:block">\s*<GlobalSearch variant="desktop"/);
    expect(header).not.toMatch(/hidden items-center gap-0\.5 md:flex/);
    expect(header).not.toMatch(/<div className="hidden md:block">/);
  });

  it("抽屉同步 xl:hidden（与页头断点一致，避免 768–1279 两套导航同时缺席或同时出现）", () => {
    expect(mobile).toContain('<div className="xl:hidden">');
    expect(mobile).not.toContain('<div className="md:hidden">');
  });
});

describe("UX-14 页头/页脚/首页分隔线容器全宽（UI §2.4 M-WIDE）", () => {
  it.each([
    "components/site/SiteHeader.tsx",
    "components/site/SiteFooter.tsx",
    "app/(site)/page.tsx",
  ])("%s 不再使用 max-w-6xl 居中容器", (p) => {
    expect(src(p)).not.toMatch(/max-w-6xl/);
  });
});

describe("UX-15 页面 H1 ≤32px", () => {
  it.each(["components/common/PageHero.tsx", "components/common/PagePlaceholder.tsx"])("%s", (p) => {
    const h1 = src(p).match(/<h1 className="([^"]+)"/)?.[1] ?? "";
    expect(h1).toContain("md:text-[32px]");
    expect(h1).not.toMatch(/text-(4xl|5xl|6xl)/);
  });
});

describe("UX-13 次要文字色主题层重映射（≥4.5:1）", () => {
  const css = src("app/globals.css");
  const themeBlock = css.match(/@theme\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  const token = (name: string) => themeBlock.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
  const muted = css.match(/--muted-foreground:\s*(#[0-9a-fA-F]{6})/)?.[1];

  it("slate-400 / slate-500 / --muted-foreground 在白、slate-50、slate-100 底均 ≥4.5:1", () => {
    for (const fg of [token("slate-400"), token("slate-500"), muted]) {
      expect(fg, "令牌缺失").toMatch(/^#[0-9a-fA-F]{6}$/);
      for (const bg of ["#ffffff", "#f8fafc", "#f1f5f9"]) {
        expect(contrast(fg!, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("保持层级：slate-400 浅于 slate-500（亮度更高）", () => {
    expect(luminance(token("slate-400")!)).toBeGreaterThan(luminance(token("slate-500")!));
  });
});

describe("UX-17 产品下拉含云服务天梯图", () => {
  it("/ladder 位于产品子项、不进分类组", () => {
    const child = NAV_ITEMS.find((n) => n.key === "products")?.children?.find((c) => c.href === "/ladder");
    expect(child?.label).toBe("云服务天梯图");
    expect(child?.group).toBeUndefined();
  });
});

describe("UX-19 搜索占位符不截断", () => {
  it("桌面 w-44 可容纳占位符（无省略号、≤10 字符）", () => {
    const placeholder = src("components/site/GlobalSearch.tsx").match(/placeholder="([^"]+)"/)?.[1] ?? "";
    expect(placeholder.length).toBeGreaterThan(0);
    expect(placeholder).not.toContain("…");
    expect([...placeholder].length).toBeLessThanOrEqual(10);
  });
});

describe("裁定 6 首页模型入口：4 卡保留，API 平台详情入口 → /providers", () => {
  it("默认配置 4 卡且该卡指向 /providers", () => {
    expect(HOME_MODEL_ENTRIES_DEFAULT).toHaveLength(4);
    expect(HOME_MODEL_ENTRIES_DEFAULT.find((c) => c.title === "API 平台详情入口")?.href).toBe("/providers");
  });

  it("首页对库内旧配置（仍指 /docs）做渲染层兼容改写", () => {
    const page = src("app/(site)/page.tsx");
    expect(page).toContain("<ModelSection entries={fixLegacyModelEntryHref(modelEntries)} />");
    expect(page).toMatch(/e\.href === "\/docs" \? \{ \.\.\.e, href: "\/providers" \}/);
  });
});
