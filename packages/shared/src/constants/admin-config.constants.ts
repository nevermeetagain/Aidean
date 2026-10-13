// 管理端 SystemConfig 白名单注册表（键元数据 + 值规则）——服务端与契约测试共用。
// 迁移说明（B-N10）：原先定义在 `app/api/v1/admin/configs/route.ts` 并导出，违反 Next 路由
// 「仅可导出 HTTP 方法等约定符号」的约束（.next/types 生成 `{ [x:string]: never }`），会导致
// `next build` 失败，故下沉到 shared（B 独占域），路由改为 import。
//
// 四处同步：本文件 / ADMIN_CONFIG_KEYS / 路由 applyConfig 分派 / prisma seed systemConfigsData。
// 值真源为 seed，此处 defaultValue 仅作库内缺行时的 GET 兜底。

import { PARTNER_CONFIG_KEYS, PARTNER_DEFAULTS, PartnerContentSchema, isSafeMediaUrl } from "../schemas/site-content.schema";
import { ROADMAP_MILESTONES_DEFAULT, RoadmapMilestonesSchema } from "../schemas/roadmap.schema";
import {
  HomeHeroSchema,
  HomeCardsSchema,
  HOME_HERO_JSON,
  HOME_VALUE_POINTS_JSON,
  HOME_MODEL_ENTRIES_JSON,
} from "../schemas/home-content.schema";
import { DocsArticlesSchema, DOCS_ARTICLES_JSON } from "../schemas/docs-content.schema";
import { MARQUEE_NAMES_JSON, MarqueeNamesSchema, ABOUT_BODY_DEFAULT, AboutBodySchema } from "../schemas/site-sections.schema";

/** 配置值类型（与 Prisma ConfigType 枚举取值一致） */
export type ConfigValueType = "STRING" | "NUMBER" | "BOOLEAN";

/** 值规则（每键一条；扩键只加注册项，不改分派 switch） */
export type ConfigValueRule =
  | { kind: "number"; min: number; max: number }
  | { kind: "string"; maxLength: number; allowEmpty: boolean; allowed?: readonly string[] }
  | { kind: "boolean" }
  | { kind: "partner" }
  | { kind: "milestones" }
  | { kind: "homeHero" }
  | { kind: "homeCards" }
  | { kind: "docsArticles" }
  | { kind: "marquee" }
  | { kind: "richText" }
  | { kind: "email"; maxLength: number }
  | { kind: "qrImage" };

export interface AdminConfigRegistryEntry {
  configKey: string;
  configGroup: string;
  configType: ConfigValueType;
  defaultValue: string;
  description: string;
  inputType: string;
  sortOrder: number;
  valueRule: ConfigValueRule;
}

export const ADMIN_CONFIG_REGISTRY: AdminConfigRegistryEntry[] = [
  {
    configKey: "ladder_score_granularity",
    configGroup: "ladder",
    configType: "NUMBER",
    defaultValue: "0.1",
    description: "模型性能天梯图性能轴/分隔栏的固定分割颗粒值（如 0.1：98.9 与 98.8 相邻档位）",
    inputType: "number",
    sortOrder: 1,
    valueRule: { kind: "number", min: 0.01, max: 10 },
  },
  {
    configKey: "site.name",
    configGroup: "general",
    configType: "STRING",
    defaultValue: "Aidean",
    description: "站点名称",
    inputType: "text",
    sortOrder: 2,
    valueRule: { kind: "string", maxLength: 200, allowEmpty: false },
  },
  {
    configKey: "site.description",
    configGroup: "general",
    configType: "STRING",
    defaultValue: "AI模型天梯图平台",
    description: "站点描述",
    inputType: "text",
    sortOrder: 3,
    valueRule: { kind: "string", maxLength: 200, allowEmpty: false },
  },
  {
    configKey: "site.logoUrl",
    configGroup: "general",
    configType: "STRING",
    defaultValue: "/images/icons/logo.svg",
    description: "站点Logo",
    inputType: "text",
    sortOrder: 4,
    valueRule: { kind: "string", maxLength: 200, allowEmpty: false },
  },
  {
    configKey: "site.title",
    configGroup: "general",
    configType: "STRING",
    defaultValue: "",
    description: "浏览器标题(为空则用站点名称)", // 与 seed systemConfigsData 同键文案严格一致（seed 为真源）
    inputType: "text",
    sortOrder: 5,
    valueRule: { kind: "string", maxLength: 200, allowEmpty: true },
  },
  {
    configKey: "site.faviconUrl",
    configGroup: "general",
    configType: "STRING",
    defaultValue: "/images/icons/logo.svg",
    description: "站点Favicon",
    inputType: "text",
    sortOrder: 6,
    valueRule: { kind: "string", maxLength: 200, allowEmpty: false },
  },
  {
    configKey: "pricing.evalPerModel",
    configGroup: "pricing",
    configType: "NUMBER",
    defaultValue: "2",
    description: "测评每模型价格(元)",
    inputType: "number",
    sortOrder: 7,
    valueRule: { kind: "number", min: 0, max: 9999 },
  },
  {
    configKey: "pricing.currency",
    configGroup: "pricing",
    configType: "STRING",
    defaultValue: "CNY",
    description: "默认货币",
    inputType: "text",
    sortOrder: 8,
    valueRule: { kind: "string", maxLength: 200, allowEmpty: false, allowed: ["CNY", "USD"] },
  },
  {
    configKey: "security.accessTokenTtlMinutes",
    configGroup: "security",
    configType: "NUMBER",
    defaultValue: "15",
    description: "访问令牌有效期(分钟)",
    inputType: "number",
    sortOrder: 9,
    valueRule: { kind: "number", min: 5, max: 60 },
  },
  {
    configKey: "security.refreshTokenTtlDays",
    configGroup: "security",
    configType: "NUMBER",
    defaultValue: "7",
    description: "刷新令牌有效期(天)",
    inputType: "number",
    sortOrder: 10,
    valueRule: { kind: "number", min: 1, max: 30 },
  },
  {
    configKey: "security.maxLoginAttempts",
    configGroup: "security",
    configType: "NUMBER",
    defaultValue: "5",
    description: "最大登录尝试次数",
    inputType: "number",
    sortOrder: 11,
    valueRule: { kind: "number", min: 1, max: 20 },
  },
  {
    configKey: "about.contactEmail",
    configGroup: "about",
    configType: "STRING",
    defaultValue: "591547726@qq.com",
    description: "联系邮箱（/about 页展示）",
    inputType: "text",
    sortOrder: 12,
    valueRule: { kind: "email", maxLength: 200 },
  },
  {
    configKey: "about.wechatQrUrl",
    configGroup: "about",
    configType: "STRING",
    defaultValue: "",
    description: "微信二维码图片 URL（空=显示待上传占位；PNG/JPEG/WebP/GIF/AVIF，≤500 字）",
    inputType: "text",
    sortOrder: 13,
    valueRule: { kind: "qrImage" },
  },
  {
    configKey: "roadmap.milestones",
    configGroup: "roadmap",
    configType: "STRING",
    defaultValue: JSON.stringify(ROADMAP_MILESTONES_DEFAULT),
    description: "产品路线图里程碑（首页与 /roadmap 共用；JSON 数组，每条含 version 版本号 / title 标题 / description 说明 / done 是否已完成，≤24 条）",
    inputType: "milestones",
    sortOrder: 14,
    valueRule: { kind: "milestones" },
  },
];

ADMIN_CONFIG_REGISTRY.push(...PARTNER_CONFIG_KEYS.map((configKey, index): AdminConfigRegistryEntry => ({
  configKey, configGroup: "partners", configType: "STRING", defaultValue: JSON.stringify(PARTNER_DEFAULTS[index]),
  description: `${PARTNER_DEFAULTS[index]!.title}合作产品内容`, inputType: "partner", sortOrder: 20 + index, valueRule: { kind: "partner" },
})));

// S4「站点可见即可改」扩容：SEO 关键词 + 首页三区块 + 帮助文档（键值真源为 seed，此处 defaultValue 兜底）。
ADMIN_CONFIG_REGISTRY.push(
  {
    configKey: "site.seo.keywords",
    configGroup: "general",
    configType: "STRING",
    defaultValue: "",
    description: "SEO 关键词（逗号分隔，前台 meta keywords，可空）",
    inputType: "text",
    sortOrder: 15,
    valueRule: { kind: "string", maxLength: 300, allowEmpty: true },
  },
  {
    configKey: "home.hero",
    configGroup: "home",
    configType: "STRING",
    defaultValue: HOME_HERO_JSON,
    description: "首页首屏文案（JSON：badge 角标 / title 主标题 / subtitle 副标题 / primaryCta·secondaryCta 按钮 {href,label} / stats 统计条数组 {value,label}）",
    inputType: "homeHero",
    sortOrder: 30,
    valueRule: { kind: "homeHero" },
  },
  {
    configKey: "home.valuePoints",
    configGroup: "home",
    configType: "STRING",
    defaultValue: HOME_VALUE_POINTS_JSON,
    description: "首页「为什么选择」价值点卡片（JSON 数组，每条 {icon 图标名,title,description}，≤8 张）",
    inputType: "homeCards",
    sortOrder: 31,
    valueRule: { kind: "homeCards" },
  },
  {
    configKey: "home.modelEntries",
    configGroup: "home",
    configType: "STRING",
    defaultValue: HOME_MODEL_ENTRIES_JSON,
    description: "首页「模型能力入口」卡片（JSON 数组，每条 {icon,title,description,href}，≤8 张）",
    inputType: "homeCards",
    sortOrder: 32,
    valueRule: { kind: "homeCards" },
  },
  {
    configKey: "docs.articles",
    configGroup: "docs",
    configType: "STRING",
    defaultValue: DOCS_ARTICLES_JSON,
    description: "帮助文档文章（JSON 数组，每条 {id,group,title,summary,sections:[{title,text}],link,linkLabel}，≤24 篇）",
    inputType: "docsArticles",
    sortOrder: 40,
    valueRule: { kind: "docsArticles" },
  },
  {
    configKey: "partners.marquee",
    configGroup: "home",
    configType: "STRING",
    defaultValue: MARQUEE_NAMES_JSON,
    description: "首页合作企业跑马灯名单（JSON 字符串数组，仅展示名称；两行反向循环，≤40 个）",
    inputType: "marquee",
    sortOrder: 33,
    valueRule: { kind: "marquee" },
  },
  {
    configKey: "about.body",
    configGroup: "home",
    configType: "STRING",
    defaultValue: ABOUT_BODY_DEFAULT,
    description: "首页「关于我们」正文（纯文本，段落以换行分隔，≤5000 字；前台按段落渲染，不注入 HTML）",
    inputType: "richText",
    sortOrder: 34,
    valueRule: { kind: "richText" },
  },
);

export type NormalizeResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

/**
 * 按注册项 valueRule 归一化配置值（纯函数，不抛异常；由调用方转成 40000 响应）。
 * number：非数值拒绝 + clamp[min,max]；string：trim + 长度 + allowEmpty + allowed 枚举；
 * boolean：仅接受 true/false（大小写不敏感），归一化为小写字符串。
 */
export function normalizeConfigValue(
  entry: AdminConfigRegistryEntry,
  configValue: string | number
): NormalizeResult {
  const raw = typeof configValue === "number" ? String(configValue) : configValue.trim();
  switch (entry.valueRule.kind) {
    case "partner": {
      if (raw.length > 10000) return { ok: false, message: "产品内容超出 10000 字" };
      try {
        const parsed = PartnerContentSchema.safeParse(JSON.parse(raw));
        return parsed.success ? { ok: true, value: JSON.stringify(parsed.data) } : { ok: false, message: parsed.error.issues[0]?.message ?? "产品内容无效" };
      } catch { return { ok: false, message: "产品内容须为有效 JSON" }; }
    }
    case "milestones": {
      if (raw.length > 10000) return { ok: false, message: "路线图内容超出 10000 字" };
      try {
        const parsed = RoadmapMilestonesSchema.safeParse(JSON.parse(raw));
        return parsed.success ? { ok: true, value: JSON.stringify(parsed.data) } : { ok: false, message: parsed.error.issues[0]?.message ?? "路线图内容无效" };
      } catch { return { ok: false, message: "路线图内容须为有效 JSON" }; }
    }
    // 以下三类「校验后存原文」：不重排键序，保证 defaultValue↔seed 逐字符一致（读侧 JSON.parse 容忍空白/键序）
    case "homeHero": {
      if (raw.length > 6000) return { ok: false, message: "首屏内容超出 6000 字" };
      try {
        const parsed = HomeHeroSchema.safeParse(JSON.parse(raw));
        return parsed.success ? { ok: true, value: raw } : { ok: false, message: parsed.error.issues[0]?.message ?? "首屏内容无效" };
      } catch { return { ok: false, message: "首屏内容须为有效 JSON" }; }
    }
    case "homeCards": {
      if (raw.length > 6000) return { ok: false, message: "卡片内容超出 6000 字" };
      try {
        const parsed = HomeCardsSchema.safeParse(JSON.parse(raw));
        return parsed.success ? { ok: true, value: raw } : { ok: false, message: parsed.error.issues[0]?.message ?? "卡片内容无效" };
      } catch { return { ok: false, message: "卡片内容须为有效 JSON" }; }
    }
    case "docsArticles": {
      if (raw.length > 100000) return { ok: false, message: "文档内容超出 100000 字" };
      try {
        const parsed = DocsArticlesSchema.safeParse(JSON.parse(raw));
        return parsed.success ? { ok: true, value: raw } : { ok: false, message: parsed.error.issues[0]?.message ?? "文档内容无效" };
      } catch { return { ok: false, message: "文档内容须为有效 JSON" }; }
    }
    // 跑马灯名单：JSON 字符串数组；校验后存原文（不重排，保证 defaultValue↔seed 逐字符一致）
    case "marquee": {
      if (raw.length > 6000) return { ok: false, message: "跑马灯名单超出 6000 字" };
      try {
        const parsed = MarqueeNamesSchema.safeParse(JSON.parse(raw));
        return parsed.success ? { ok: true, value: raw } : { ok: false, message: parsed.error.issues[0]?.message ?? "名单无效" };
      } catch { return { ok: false, message: "跑马灯名单须为有效 JSON 数组" }; }
    }
    // 关于正文：纯文本非空且不超长；存原文（trim 后）
    case "richText": {
      const parsed = AboutBodySchema.safeParse(raw);
      return parsed.success ? { ok: true, value: raw } : { ok: false, message: parsed.error.issues[0]?.message ?? "关于正文无效" };
    }
    case "number": {
      const num = Number(raw);
      if (!Number.isFinite(num)) return { ok: false, message: "配置值须为数值" };
      const clamped = Math.min(entry.valueRule.max, Math.max(entry.valueRule.min, num));
      return { ok: true, value: String(clamped) };
    }
    case "boolean": {
      const lower = raw.toLowerCase();
      if (lower !== "true" && lower !== "false") {
        return { ok: false, message: "布尔配置值仅允许 true/false" };
      }
      return { ok: true, value: lower };
    }
    case "email": {
      if (!raw) return { ok: false, message: "配置值不能为空" };
      if (raw.length > entry.valueRule.maxLength) {
        return { ok: false, message: `配置值长度超出上限（${entry.valueRule.maxLength} 字）` };
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return { ok: false, message: "邮箱格式不正确" };
      return { ok: true, value: raw };
    }
    case "qrImage": {
      // 空串=回退占位 UI；非空须通过 isSafeMediaUrl（PNG/JPEG/WebP/GIF/AVIF，不接受 SVG）
      if (!raw) return { ok: true, value: "" };
      if (!isSafeMediaUrl(raw, "image")) {
        return { ok: false, message: "二维码须为 http(s) 或 /images/、/media/ 安全路径；图片 PNG/JPEG/WebP/GIF/AVIF（URL ≤500 字）" };
      }
      return { ok: true, value: raw };
    }
    case "string": {
      if (!raw && !entry.valueRule.allowEmpty) {
        return { ok: false, message: "配置值不能为空" };
      }
      if (raw.length > entry.valueRule.maxLength) {
        return { ok: false, message: `配置值长度超出上限（${entry.valueRule.maxLength} 字）` };
      }
      const allowed = entry.valueRule.allowed;
      if (allowed && allowed.length > 0 && !allowed.includes(raw)) {
        return { ok: false, message: `配置值不在允许范围内（允许 ${allowed.join("/")}）` };
      }
      return { ok: true, value: raw };
    }
  }
  return { ok: false, message: "未支持的配置类型" };
}
