// i18n 统一导出
export { translations, type Lang, type Translation } from "./translations";
export { productsTranslations, type ProductsTranslation } from "./products";
export { resourcesTranslations, type ResourcesTranslation } from "./resources";

// 辅助函数：获取当前语言的翻译
import { translations } from "./translations";
import { productsTranslations } from "./products";
import { resourcesTranslations } from "./resources";
import type { Lang } from "./translations";

// 安全的翻译获取函数（ja回退到zh）
function getSafeTranslation<T extends Record<string, any>>(
  translations: T,
  lang: Lang
): T[keyof T] {
  if (lang === "ja") return translations["zh"];
  return translations[lang] ?? translations["zh"];
}

export function getTranslations(lang: Lang) {
  return {
    ...getSafeTranslation(translations, lang),
    productsPage: getSafeTranslation(productsTranslations, lang),
    resourcesPage: getSafeTranslation(resourcesTranslations, lang),
  };
}

export type FullTranslation = ReturnType<typeof getTranslations>;
