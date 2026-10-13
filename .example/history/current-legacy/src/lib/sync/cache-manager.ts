/**
 * 缓存管理器 (Cache Manager)
 * 处理模型数据同步后的缓存失效和更新
 */

import { revalidatePath, revalidateTag } from "next/cache";

// 缓存标签定义
export const CACHE_TAGS = {
  MODELS: "models",
  MODEL_DETAIL: "model-detail",
  RANKINGS: "rankings",
  LADDER: "ladder",
  PRICES: "prices",
  VENDORS: "vendors",
  CATEGORIES: "categories",
} as const;

// 需要刷新的路径
const PATHS_TO_REVALIDATE = [
  "/models",
  "/ladder",
  "/rankings",
  "/api/v1/models",
  "/api/v1/rankings",
];

/**
 * 执行全量缓存刷新
 * 在同步完成后调用，确保数据一致性
 */
export async function invalidateAllModelCaches(): Promise<{
  success: boolean;
  invalidated: string[];
  errors: string[];
}> {
  const invalidated: string[] = [];
  const errors: string[] = [];

  // 1. 刷新缓存标签
  try {
    Object.values(CACHE_TAGS).forEach((tag) => {
      revalidateTag(tag);
      invalidated.push(`tag:${tag}`);
    });
    console.log("[CacheManager] Revalidated cache tags");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`Failed to revalidate tags: ${message}`);
  }

  // 2. 刷新关键页面路径
  for (const path of PATHS_TO_REVALIDATE) {
    try {
      revalidatePath(path);
      invalidated.push(`path:${path}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to revalidate path ${path}: ${message}`);
    }
  }

  console.log(`[CacheManager] Invalidated ${invalidated.length} caches`);

  return {
    success: errors.length === 0,
    invalidated,
    errors,
  };
}

/**
 * 刷新特定模型的缓存
 */
export async function invalidateModelCache(modelId: string): Promise<boolean> {
  try {
    revalidateTag(`${CACHE_TAGS.MODEL_DETAIL}:${modelId}`);
    revalidatePath(`/models/${modelId}`);
    console.log(`[CacheManager] Invalidated cache for model: ${modelId}`);
    return true;
  } catch (error) {
    console.error(`[CacheManager] Failed to invalidate model cache: ${modelId}`, error);
    return false;
  }
}

/**
 * 刷新天梯排名缓存
 */
export async function invalidateLadderCache(): Promise<boolean> {
  try {
    revalidateTag(CACHE_TAGS.LADDER);
    revalidateTag(CACHE_TAGS.RANKINGS);
    revalidatePath("/ladder");
    revalidatePath("/rankings");
    console.log("[CacheManager] Invalidated ladder rankings cache");
    return true;
  } catch (error) {
    console.error("[CacheManager] Failed to invalidate ladder cache:", error);
    return false;
  }
}

/**
 * 刷新价格缓存
 */
export async function invalidatePriceCache(): Promise<boolean> {
  try {
    revalidateTag(CACHE_TAGS.PRICES);
    console.log("[CacheManager] Invalidated price cache");
    return true;
  } catch (error) {
    console.error("[CacheManager] Failed to invalidate price cache:", error);
    return false;
  }
}

/**
 * 获取缓存状态
 */
export function getCacheStatus(): {
  tags: string[];
  paths: string[];
  lastInvalidatedAt: Date | null;
} {
  return {
    tags: Object.values(CACHE_TAGS),
    paths: PATHS_TO_REVALIDATE,
    lastInvalidatedAt: null, // 实际生产环境可从 Redis 等存储中获取
  };
}
