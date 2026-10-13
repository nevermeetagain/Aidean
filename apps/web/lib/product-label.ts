/**
 * product-label — 产品显示名与分类标签的统一底座（#71）。
 *
 * 单一映射源，消灭导航/列表/后台三处各写中文映射的漂移面。
 * 新增分类 = 改 PRODUCT_CATEGORY_LABELS + schema enum 一处。
 */

export const PRODUCT_CATEGORY_LABELS: Record<string, string> = {
  OFFERING: "特供",
  OPEN_SOURCE: "开源",
  PARTNER: "合作",
};

/** 分类组序（null=未分类，排末尾「其它」组） */
export const PRODUCT_CATEGORY_ORDER: readonly (string | null)[] = [
  "OFFERING",
  "OPEN_SOURCE",
  "PARTNER",
  null,
];

export function productCategoryLabel(category: string | null | undefined): string {
  if (!category) return "其它";
  return PRODUCT_CATEGORY_LABELS[category] ?? "其它";
}

/**
 * 分类排序位次（站点级归类排序用）：特供 → 开源 → 合作 → 未分类；未知值排最后。
 * 首页 ProductSection 与 /products 共用，保证同一产品在任何前台面的相对次序一致。
 */
export function productCategoryRank(category: string | null | undefined): number {
  const i = PRODUCT_CATEGORY_ORDER.indexOf(category ?? null);
  return i < 0 ? PRODUCT_CATEGORY_ORDER.length : i;
}

export interface ProductLabelInput {
  name: string;
  displayName?: string | null;
}

/**
 * 产品显示名。
 * - bilingual=true（默认）：有中文名时 `中文名（英文名）`，无则英文名。
 * - bilingual=false：有中文名时纯中文名，无则英文名（导航下拉用，更短）。
 */
export function productLabel(
  p: ProductLabelInput,
  opts: { bilingual?: boolean } = {},
): string {
  const bilingual = opts.bilingual ?? true;
  if (p.displayName) {
    return bilingual ? `${p.displayName}（${p.name}）` : p.displayName;
  }
  return p.name;
}
