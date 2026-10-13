// 首页区块文案契约（home.* 配置键共用）：首屏 Hero / 平台价值点 / 模型入口卡片。
// - 铁律「可见即可改」：首页各区块文案后台可编辑，缺行/非法/DB 不可用一律回退此处 DEFAULT
//   （模式对齐 roadmap.schema.ts / site-content.schema.ts，页面永不因配置失败阻断）；
// - 单一真源：每个键的规范 JSON 字符串（*_JSON）为唯一手写真源，DEFAULT 对象由其解析而得，
//   registry.defaultValue 与 prisma seed 均引用同一字符串（admin-config-seed-parity 守卫逐字符校验）；
// - icon 以受限枚举名存储，前端 HomeIcons 映射表解析为 lucide 组件（新增枚举须同步映射表）。
import { z } from "zod";

/** 首页卡片可选图标名（前端 HomeIcons 映射表须与之一一对应，未知名回退 Sparkles） */
export const HOME_ICON_NAMES = [
  "BarChart3", "Wallet", "LayoutGrid", "Trophy", "Cloud", "Scale", "BookOpen",
  "Sparkles", "Zap", "Shield", "Users", "Rocket", "Globe", "Cpu", "MessageSquare",
] as const;
export type HomeIconName = (typeof HOME_ICON_NAMES)[number];
const iconField = z.enum(HOME_ICON_NAMES, { errorMap: () => ({ message: "图标名不在允许列表内" }) });

// ==================== 首屏 Hero（home.hero） ====================
export const HomeHeroCtaSchema = z.object({
  href: z.string().trim().min(1, "链接不能为空").max(200, "链接 ≤200 字"),
  label: z.string().trim().min(1, "按钮文案不能为空").max(40, "按钮文案 ≤40 字"),
}).strict();
export const HomeHeroStatSchema = z.object({
  value: z.string().trim().min(1, "数值文案不能为空").max(40, "数值文案 ≤40 字"),
  label: z.string().trim().max(40, "标签 ≤40 字"),
}).strict();
export const HomeHeroSchema = z.object({
  badge: z.string().trim().max(120, "角标 ≤120 字"),
  title: z.string().trim().min(1, "主标题不能为空").max(120, "主标题 ≤120 字"),
  subtitle: z.string().trim().max(300, "副标题 ≤300 字"),
  primaryCta: HomeHeroCtaSchema,
  secondaryCta: HomeHeroCtaSchema,
  stats: z.array(HomeHeroStatSchema).min(1, "至少一条统计").max(6, "统计最多 6 条"),
}).strict();
export type HomeHero = z.infer<typeof HomeHeroSchema>;

/**
 * home.hero 规范 JSON 真源（compact，无空格；与重构前 HeroBanner 文案逐字一致，作 DB 缺行兜底）。
 * seed systemConfigsData 与 registry defaultValue 均须与此字符串完全相同。
 */
export const HOME_HERO_JSON = `{"badge":"天梯图评测 · 统一计费网关 · 一次充值全平台可用","title":"扫一眼，完成模型与云服务选型","subtitle":"Aidean 用统一口径的实测数据把各家大模型的性能排清楚——天梯图可视化评测，一次充值即可调用全平台模型与云服务。","primaryCta":{"href":"/models","label":"查看模型天梯图"},"secondaryCta":{"href":"/pricing","label":"价格中心"},"stats":[{"value":"统一口径","label":"实测评测"},{"value":"多家聚合","label":"计费网关"},{"value":"一次充值","label":"全平台可用"}]}`;
export const HOME_HERO_DEFAULT: HomeHero = HomeHeroSchema.parse(JSON.parse(HOME_HERO_JSON));

// ==================== 通用卡片（home.valuePoints / home.modelEntries） ====================
export const HomeCardSchema = z.object({
  icon: iconField,
  title: z.string().trim().min(1, "标题不能为空").max(60, "标题 ≤60 字"),
  description: z.string().trim().min(1, "描述不能为空").max(200, "描述 ≤200 字"),
  href: z.string().trim().max(200, "链接 ≤200 字").optional(),
}).strict();
export const HomeCardsSchema = z.array(HomeCardSchema).min(1, "至少一张卡片").max(8, "卡片最多 8 张");
export type HomeCard = z.infer<typeof HomeCardSchema>;

/** home.valuePoints 规范 JSON 真源（与重构前 PlatformIntro VALUE_POINTS 逐字一致） */
export const HOME_VALUE_POINTS_JSON = `[{"icon":"BarChart3","title":"天梯图可视化评测","description":"以统一口径的实测数据绘制大模型与云服务天梯图，谁强谁弱、性价几何，一张图看懂。"},{"icon":"Wallet","title":"统一计费网关，一次充值通吃","description":"聚合各云厂商的 Key 池与额度，一次充值即可跨平台调用，告别多头开户与重复预付。"},{"icon":"LayoutGrid","title":"平台产品矩阵","description":"RAG 知识库、微信自动化机器人、技能云端市场协同发力，从选型到落地一站完成。"}]`;
export const HOME_VALUE_POINTS_DEFAULT: HomeCard[] = HomeCardsSchema.parse(JSON.parse(HOME_VALUE_POINTS_JSON));

/** home.modelEntries 规范 JSON 真源（与重构前 ModelSection MODEL_ENTRIES 逐字一致） */
export const HOME_MODEL_ENTRIES_JSON = `[{"icon":"Trophy","title":"模型对比天梯图","description":"实测性能矩阵可视化呈现，旗舰与高性价比模型一榜看尽。","href":"/models"},{"icon":"Cloud","title":"大模型云服务天梯图","description":"聚合主流云厂商 API 平台的价格、稳定性与限流观测。","href":"/ladder"},{"icon":"Scale","title":"模型对比","description":"把候选模型加入对比车，逐维度横向打分与取舍。","href":"/evaluations"},{"icon":"BookOpen","title":"API 平台详情入口","description":"各平台资费细则、免费额度与计费规则逐项拆解。","href":"/docs"}]`;
export const HOME_MODEL_ENTRIES_DEFAULT: HomeCard[] = HomeCardsSchema.parse(JSON.parse(HOME_MODEL_ENTRIES_JSON));

/** 前台读取兜底：合法 JSON → 校验后的 Hero；任何异常 → 回默认（深拷贝防篡改常量） */
export function parseHomeHero(value: string | undefined): HomeHero {
  try {
    return HomeHeroSchema.parse(JSON.parse(value ?? ""));
  } catch {
    return structuredClone(HOME_HERO_DEFAULT);
  }
}

/** 前台读取兜底：合法 JSON → 校验后的卡片数组；任何异常 → 回传入默认 */
export function parseHomeCards(value: string | undefined, fallback: HomeCard[]): HomeCard[] {
  try {
    return HomeCardsSchema.parse(JSON.parse(value ?? ""));
  } catch {
    return fallback.map((c) => ({ ...c }));
  }
}
