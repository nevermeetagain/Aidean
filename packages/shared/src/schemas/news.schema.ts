import { z } from "zod";

import { NEWS_CATEGORIES, NEWS_CONTENT_MAX, NEWS_SUMMARY_MAX, NEWS_TITLE_MAX } from "../constants/news.constants";

/** slug：小写字母/数字/中划线，2~64 位，首尾非中划线（公开 URL 段）。 */
export const NEWS_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/;

const category = z.enum(NEWS_CATEGORIES, {
  errorMap: () => ({ message: "分类必须是白名单值（热门/AI/硬件/软件/平台动态/功能更新/功能指引/官方公告）" }),
});

/** 新建资讯（POST /api/v1/admin/news）。正文只存 Markdown，渲染发生在 SSR 展示端。 */
export const AdminNewsCreateSchema = z
  .object({
    slug: z.string().trim().regex(NEWS_SLUG_PATTERN, "slug 仅允许小写字母/数字/中划线，2~64 位，且不以中划线开头或结尾"),
    title: z.string().trim().min(1, "标题不能为空").max(NEWS_TITLE_MAX),
    summary: z.string().trim().max(NEWS_SUMMARY_MAX).default(""),
    category,
    contentMarkdown: z.string().min(1, "正文（Markdown）不能为空").max(NEWS_CONTENT_MAX, `正文不得超过 ${NEWS_CONTENT_MAX} 字`),
    pinned: z.boolean().default(false),
    status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  })
  .strict();
export type AdminNewsCreate = z.infer<typeof AdminNewsCreateSchema>;

/** 编辑资讯（PATCH /api/v1/admin/news/[id]）：至少一个字段。 */
export const AdminNewsPatchSchema = AdminNewsCreateSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  "至少提交一个待修改字段",
);
export type AdminNewsPatch = z.infer<typeof AdminNewsPatchSchema>;
