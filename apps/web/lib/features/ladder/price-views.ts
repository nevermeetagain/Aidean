/**
 * TASK-097（review-ext12 D5）：价格写入后统一失效「展示价格」的两层缓存。
 *   ① Next ISR 页缓存：/pricing、/models、/ladder，以及详情页 /(site)/models/[slug]（动态段需用含路由组的文件系统路径，
 *      Next 15 的页面缓存 tag 取自 definition.page = "/(site)/models/[slug]/page"，review-097 M1）；
 *   ② Redis 天梯矩阵缓存 ladder:matrix:*（invalidateLadderCache）。
 * 只清 ① 时 SSR 重渲染仍会从 Redis 读到旧价（admin/models/[id] RW-3 取证同一问题）。
 * 失效失败静默：Redis TTL 已对齐价格边界（ttlUntilBoundary），不阻断写入成功响应。
 */
import { revalidatePath } from "next/cache";

import { ladderService } from "./service";

export async function invalidatePriceViews(): Promise<void> {
  revalidatePath("/pricing");
  revalidatePath("/models");
  revalidatePath("/(site)/models/[slug]", "page");
  revalidatePath("/ladder");
  try {
    await ladderService.invalidateLadderCache();
  } catch {
    /* 静默：TTL 兜底 */
  }
}
