/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Docker 多阶段构建依赖 standalone 产物（SubTask 0.5.1）
  output: "standalone",
  transpilePackages: ["@aidean/shared"],
  // 构建产物目录：默认 .next（next dev / next start / Docker 均不受影响）；
  // 置 AIDEAN_DIST_DIR 可在本地另起一份产物做并行构建验证，不打断正在运行的 dev 进程。
  distDir: process.env.AIDEAN_DIST_DIR || ".next",
  experimental: {
    // Next 15 只识别 experimental.optimizePackageImports，顶层同名键会被丢弃并触发
    // 「Invalid next.config.mjs options detected: Unrecognized key(s)」告警（实测 Next 15.0.0）。
    // lucide-react / recharts 已在 Next 内置默认表（next/dist/server/config.js 第 619-641 行，
    // 用户值与之并集合并），此处补齐 zustand 并固化全站 barrel 白名单。
    //
    // 导航性能优化（2026-09-28）：补齐 @aidean/ui——该包 barrel export 包含 EChartWrapper
    // （依赖 echarts/zrender ~900KB），不加 optimizePackageImports 时即使只导入 Button/Badge
    // 也会在 dev 编译期拉入全量模块树（实测每页 ~2200 modules），拖慢首次编译 600ms-2.4s。
    // 加入后 Next 按 import 路径做 per-module tree-shaking，只编译实际引用的组件。
    optimizePackageImports: ["lucide-react", "zustand", "@aidean/ui"],
    // 导航性能优化（2026-10-09）：
    // Next 15 默认 staleTimes.dynamic = 0，导致 force-dynamic 路由的客户端路由缓存立即失效——
    // 每次软导航都走完整 RSC 往返（middleware → layout → page），30s 内重复访问不复用。
    // 设 30s 后，同一会话内来回切换 admin 页面命中客户端缓存直接渲染，显著改善「点哪都慢」。
    // 安全考量：admin 数据可能 30s 陈旧；关键写操作（保存/删除）后调用 router.refresh() 主动失效。
    staleTimes: {
      dynamic: 30,
    },
  },
  // sanitize-html 依赖的 htmlparser2@12 为纯 ESM（type:module，无 require 出口），
  // webpack 拒绝将其打进服务端 bundle；标记 external 后由 Node 运行期 require(esm) 加载（Node ≥22.12）。
  serverExternalPackages: ["sanitize-html"],
};

export default nextConfig;
