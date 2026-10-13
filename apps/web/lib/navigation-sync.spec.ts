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
      if (!m) continue; // /models、/providers 等主站服务入口非产品 slug
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

    // 模型天梯图 / 模型服务提供商是主站服务，必须排在所有分类组之前
    const serviceIdx = children.findIndex((c) => c.href === "/models");
    expect(serviceIdx).toBeGreaterThanOrEqual(0);
    expect(children[serviceIdx + 1]?.href).toBe("/providers");
    expect(first(productCategoryLabel(PRODUCT_CATEGORY_ORDER[0]))).toBeGreaterThan(serviceIdx + 1);

    // 分类组严格按 PRODUCT_CATEGORY_ORDER 出现（含未分类归口的「其它」置末）
    let prev = serviceIdx + 1;
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
