// > 版本: v0.1 | 更新: 2026-10-13 | 变更: 首次冻结（任务规划V0.1.0 · 契约④ Resources）
// ============================================================================
// 契约④ Resources —— 现行资源事实 + 本规划约束。本规划【不新增上传端点】（无对象存储依赖，ADR-0001 技术栈未含）。
// 事实证据：
//   - 全仓唯一 multipart 入口：apps/web/app/api/v1/admin/benchmarks/import/route.ts（CSV ≤500 行，admin.benchmarks.write）
//   - 图片：/public 静态资源（apps/web/public/brands|images/**）+ 外链 URL（SystemConfig about.wechatQrUrl、Product.intro.links）
//   - 外链渲染：apps/web/components/common/SafeImage.tsx（<img>，lint 唯一 warning 来源）
//   - 出网安全：apps/web/lib/security/url-policy.ts（SSRF 守卫；服务端拉取外部 URL 必须经此）
// ============================================================================
import { z } from "zod";

/** 外链 URL：仅 http/https；站内资源用以 "/" 开头的绝对路径 */
export const ExternalUrlSchema = z
  .string()
  .url()
  .refine((u) => u.startsWith("http://") || u.startsWith("https://"), "仅允许 http/https");
export const SiteAssetPathSchema = z.string().regex(/^\/(images|brands)\/[A-Za-z0-9._\-/]+\.(png|jpe?g|webp|gif|avif|svg|ico)$/);
export const ImageRefSchema = z.union([ExternalUrlSchema, SiteAssetPathSchema]);

export const RESOURCE_RULES = {
  upload: {
    endpoints: ["POST /api/v1/admin/benchmarks/import (text/csv, <=500 行)"],
    auth: "requireAdminApi('admin.benchmarks.write')",
    newUploadEndpointsInThisPlan: 0,
  },
  images: {
    allowedExt: ["png", "jpg", "jpeg", "webp", "gif", "avif", "svg", "ico"],
    render: "SafeImage（失败兜底占位，不抛错）",
    serverFetch: "必须经 lib/security/url-policy.ts（SSRF 守卫），禁止裸 fetch 外部 URL",
  },
  access: {
    public: "/public/** 与外链均为公开可读；不得放置含用户数据的文件",
    private: "无私有对象（本规划不引入）",
  },
  lifecycle: {
    publicAssets: "随代码版本发布，删除须同步引用（check-docs-facts 计数守卫）",
    externalLinks: "由运营在后台配置，失效由 SafeImage 兜底；不做存活探测（本规划不新增定时任务）",
    screenshots_S9: "仅存 URL（ProductIntroScreenshotSchema），素材托管位置待 U-4 裁决",
  },
} as const;
