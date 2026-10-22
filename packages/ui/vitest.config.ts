import { defineConfig } from "vitest/config";

export default defineConfig({
  // B11-04a：Select/Textarea/Label 单测使用 .spec.tsx 与 JSX，esbuild 默认走 classic runtime
  // 会要求每文件显式 import React；改 automatic 与 apps/web/vitest.config.ts 保持一致。
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "node",
    // 保留原 .spec.ts（cn 单测）,新增 .spec.tsx（组件单测,零 DOM 用 react-dom/server 渲染）
    include: ["src/**/*.spec.ts", "src/**/*.spec.tsx"],
  },
});
