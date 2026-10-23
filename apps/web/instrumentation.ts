/**
 * Next.js 15 根 instrumentation（T120-05）：进程启动时一次性核验环境变量清单。
 *
 * 契约：next/dist/server/instrumentation/types.d.ts 的 InstrumentationModule.register()；
 *      Next 15.2 起该文件必须位于项目根（apps/web/instrumentation.ts），非 app/ 子目录。
 *
 * 只在 Node 运行时执行：Edge 运行时不得引入 zod/node 依赖，故按 NEXT_RUNTIME 提前返回。
 * 校验的严格/降级口径见 lib/config/env.ts 文件头（构建期与单测期不 fail-fast，
 * 以免打断既有 next build 与 vitest —— 这两类场景下必需变量本就由部署链注入）。
 *
 * 失败语义：必需变量（DATABASE_URL、JWT_SECRET）缺失 → 抛错终止启动，消息逐条含变量名；
 *          可选/建议项仅打 [env] 前缀告警，不改变任何既有读取点的默认值语义。
 *
 * 只导出具名 register（不写 default export）：Next 取模块走 interopDefault(mod)=mod.default||mod，
 *   再读 .register —— 若把 default 导出成函数，register 会被静默跳过（next/dist/server/lib/
 *   router-utils/instrumentation-globals.external.js:60-63 实测口径）。同一文件亦确认
 *   NEXT_PHASE=phase-production-build 时 Next 根本不调用 register（构建期天然不 fail-fast）。
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { getEnv } = await import("./lib/config/env");
  getEnv();
}
