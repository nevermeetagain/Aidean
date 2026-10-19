/**
 * TASK-060 · 目录 collector 注册表（key → collector）。
 * 一致性（单测断言，沿用 lib/sync/sources/registry 防漂移范式；V0.9.0 执行裁定 E9-08）：
 *   ① 注册表键 ⊆ seed monitoringSourcesData 键；② seed 中 enabled=true 的源 ⊆ 注册表键（调度不空跑）。
 *   huggingface / llmtest 已在 seed 登记但 enabled=false，collector 待后续卡（llmtest → TASK-073）。
 */
import { aihubmixCollector } from "./aihubmix";
import { openrouterCollector } from "./openrouter";
import { quanzilCollector } from "./quanzil";
import type { CatalogCollector } from "./types";

export const CATALOG_COLLECTORS: Readonly<Record<string, CatalogCollector>> = Object.freeze({
  [openrouterCollector.key]: openrouterCollector,
  [aihubmixCollector.key]: aihubmixCollector,
  [quanzilCollector.key]: quanzilCollector,
});

export function getCatalogCollector(key: string): CatalogCollector | undefined {
  return Object.prototype.hasOwnProperty.call(CATALOG_COLLECTORS, key) ? CATALOG_COLLECTORS[key] : undefined;
}
