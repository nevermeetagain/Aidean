/** 资讯分类白名单（news-admin-cms）：扩充分类=改此处一行；后台与 API 共用，防脏分类。「官方公告」= S7 静态资讯迁库归集类别（见 finalize-admin-ia-and-ops-gaps）。 */
export const NEWS_CATEGORIES = ["热门", "AI", "硬件", "软件", "平台动态", "功能更新", "功能指引", "官方公告"] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

/** 正文 Markdown 长度上限（字数）：编辑器与 API 双端校验。 */
export const NEWS_CONTENT_MAX = 50000;
export const NEWS_SUMMARY_MAX = 300;
export const NEWS_TITLE_MAX = 120;

export function isNewsCategory(value: unknown): value is NewsCategory {
  return typeof value === "string" && (NEWS_CATEGORIES as readonly string[]).includes(value);
}
