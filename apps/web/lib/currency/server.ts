/**
 * TASK-102 · 服务端组件 / Route Handler 读取当前请求展示币种（供 TASK-053 价格展示）。
 * 仅限服务端（next/headers）；注意：调用即令页面按请求动态渲染（ISR 页需由 053 处理缓存口径）。
 */
import { headers } from "next/headers";
import type { SupportedCurrency } from "@aidean/shared";

import { readDisplayCurrency } from "./index";

export async function getRequestDisplayCurrency(): Promise<SupportedCurrency> {
  return readDisplayCurrency(await headers());
}
