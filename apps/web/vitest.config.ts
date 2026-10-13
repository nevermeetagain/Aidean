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
    include: ["lib/**/*.spec.ts"],
    // 15s：auth 首调 RS256 generateKeyPair（无 REDIS_URL 时进程内生成）在低速机/冷机
    // 可达 5~6s，默认 5s 会把慢初始化误判为死锁超时（2026-10-01 实测 12 例假失败）。
    testTimeout: 15000,
  },
});
