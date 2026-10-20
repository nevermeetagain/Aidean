import { defineConfig } from "vitest/config";

export default defineConfig({
  // esbuild 自动 JSX runtime：vitest 用 esbuild 转译 tsx，默认 classic runtime
  // 要求每个文件显式 import React。设为 automatic 后 esbuild 自动从
  // react/jsx-runtime 导入（React 18.3.1 自带），与 Next.js 构建行为一致，
  // 解决 PagePlaceholder 等 Server Component 在单测中 "React is not defined"。
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "node",
    // TASK-101：仓库根 scripts/crawl 的采集脚本单测一并纳入 web 全局门禁（脚本经 apps/web 的依赖运行）
    include: ["lib/**/*.spec.ts", "../../scripts/crawl/__tests__/*.spec.ts"],
    // 15s：auth 首调 RS256 generateKeyPair（无 REDIS_URL 时进程内生成）在低速机/冷机
    // 可达 5~6s，默认 5s 会把慢初始化误判为死锁超时（2026-10-01 实测 12 例假失败）。
    testTimeout: 15000,
    // 覆盖率基线（TASK-038 / REQ-NF-008）：v8 provider，仅上报不设阈值（无 thresholds）。
    // 默认 `vitest run` 不启用；`vitest run --coverage` 或 CI 传 --coverage 时产出。
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary"],
      reportsDirectory: "./coverage",
      // 基线只度量单测实际触及的 lib 单元面（与 test.include=lib/**/*.spec.ts 对齐）；
      // 排除测试自身。app/components 等未纳入本轮单测的目录不计入该基线分母。
      include: ["lib/**"],
      exclude: ["lib/**/*.spec.ts", "lib/**/__tests__/**"],
      all: true,
    },
  },
});
