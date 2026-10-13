import { describe, expect, it } from "vitest";
import { productLabel, productCategoryLabel, productCategoryRank, PRODUCT_CATEGORY_LABELS, PRODUCT_CATEGORY_ORDER } from "./product-label";

describe("product-label（#71 产品显示名/分类映射）", () => {
  it("bilingual（默认）：有中文名 → 中文（英文）；无 → 英文名", () => {
    expect(productLabel({ name: "AideanBot", displayName: "信源引擎机器人" })).toBe("信源引擎机器人（AideanBot）");
    expect(productLabel({ name: "SkillsCloud" })).toBe("SkillsCloud");
    expect(productLabel({ name: "SkillsCloud", displayName: null })).toBe("SkillsCloud");
  });

  it("bilingual=false：有中文名 → 纯中文（导航下拉用）；无 → 英文名", () => {
    expect(productLabel({ name: "AideanBot", displayName: "信源引擎机器人" }, { bilingual: false })).toBe("信源引擎机器人");
    expect(productLabel({ name: "SkillsCloud" }, { bilingual: false })).toBe("SkillsCloud");
  });

  it("分类映射：三值 + null/未知 → 其它", () => {
    expect(productCategoryLabel("OFFERING")).toBe("特供");
    expect(productCategoryLabel("OPEN_SOURCE")).toBe("开源");
    expect(productCategoryLabel("PARTNER")).toBe("合作");
    expect(productCategoryLabel(null)).toBe("其它");
    expect(productCategoryLabel(undefined)).toBe("其它");
    expect(productCategoryLabel("UNKNOWN_VALUE")).toBe("其它");
  });

  it("组序契约固定：特供 → 开源 → 合作 → 其它(null)；映射与组序值域一致", () => {
    expect(PRODUCT_CATEGORY_ORDER).toEqual(["OFFERING", "OPEN_SOURCE", "PARTNER", null]);
    for (const c of PRODUCT_CATEGORY_ORDER) {
      if (c !== null) expect(PRODUCT_CATEGORY_LABELS[c]).toBeDefined();
    }
  });

  it("productCategoryRank（#73 站点级归类排序）：组序位次递增，null/未知置末", () => {
    expect(PRODUCT_CATEGORY_ORDER.map((c) => productCategoryRank(c))).toEqual([0, 1, 2, 3]);
    expect(productCategoryRank(undefined)).toBe(3);
    expect(productCategoryRank("UNKNOWN_VALUE")).toBe(PRODUCT_CATEGORY_ORDER.length);
    expect(productCategoryRank("OFFERING")).toBeLessThan(productCategoryRank("OPEN_SOURCE"));
    expect(productCategoryRank("OPEN_SOURCE")).toBeLessThan(productCategoryRank("PARTNER"));
    expect(productCategoryRank("PARTNER")).toBeLessThan(productCategoryRank(null));
  });
});
