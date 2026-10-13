// 首页「合作跑马灯」与「关于正文」两配置键契约（S8 CMS 化 · finalize-admin-ia-and-ops-gaps B4）：
// - partners.marquee：合作企业名单（JSON 字符串数组，仅文本名，跑马灯两行反向循环展示）；
// - about.body：首页「关于我们」正文（纯文本，段落以换行分隔；前台按 <p> 渲染，不注入 HTML 防 XSS）。
// 单一真源：每个键规范字符串（*_JSON / ABOUT_BODY_DEFAULT）为唯一手写真源，DEFAULT 由其解析而得，
// registry.defaultValue 与 prisma seed 均引用同一字符串（admin-config-seed-parity 守卫逐字符校验）；
// 缺行/非法/DB 不可用一律回退此处 DEFAULT，页面永不因配置失败阻断（对齐 home-content/roadmap 模式）。
import { z } from "zod";

// ==================== 合作跑马灯名单（partners.marquee） ====================
export const MarqueeNamesSchema = z
  .array(z.string().trim().min(1, "名称不能为空").max(40, "名称 ≤40 字"))
  .min(1, "至少一个合作方名称")
  .max(40, "最多 40 个名称");

/**
 * partners.marquee 规范 JSON 真源（compact，无空格；与重构前 PartnerMarquee 硬编码 12 名逐字一致）。
 * 顺序：前 6 入第一行（正向），后 6 入第二行（反向），由消费端按半切分。
 */
export const MARQUEE_NAMES_JSON = `["星辰智能","云梯科技","启明数据","青野智联","光年算法","极目实验室","南风智算","白泽信息","鹏程云脑","墨子矩阵","听涛科技","九章模型云"]`;
export const MARQUEE_NAMES_DEFAULT: string[] = MarqueeNamesSchema.parse(JSON.parse(MARQUEE_NAMES_JSON));

/** 前台读取兜底：合法 JSON 数组 → 校验后的名单；任何异常 → 回默认名单 */
export function parseMarqueeNames(value: string | undefined): string[] {
  try {
    return MarqueeNamesSchema.parse(JSON.parse(value ?? ""));
  } catch {
    return MARQUEE_NAMES_DEFAULT.map((n) => n);
  }
}

// ==================== 首页关于正文（about.body） ====================
export const ABOUT_BODY_MAX = 5000;
export const AboutBodySchema = z
  .string()
  .trim()
  .min(1, "关于正文不能为空")
  .max(ABOUT_BODY_MAX, `关于正文 ≤${ABOUT_BODY_MAX} 字`);

/**
 * about.body 规范文本真源（纯文本，无首尾空白；与重构前 AboutSection 单段简介一致，作 DB 缺行兜底）。
 * seed systemConfigsData 与 registry defaultValue 均须与此字符串完全相同（parity 守卫逐字符校验）。
 */
export const ABOUT_BODY_DEFAULT =
  "Aidean 是一个面向开发者与团队的 AI 选型与应用平台。我们以可复现的实测数据构建大模型与云服务天梯图，让每一次选型都有据可依；通过统一计费网关把分散在各云厂商的额度收敛成一个余额池，一次充值即可跨平台调用；再以信源引擎机器人（AideanBot，生态内亦称 WeChatRag）、独立知识百科（AideanWiki）、自动化舰队引擎（AideanFleet）与论文审查助手（AideanThesis）等构成的产品矩阵，覆盖从「模型选型」到「业务落地」的完整链路。团队坚持公开透明、按量计费，拒绝黑箱定价与隐性加价，让每一分钱都花在看得见的算力上。";

/** 前台读取兜底：非空且不超长 → trim 后正文；空/非法/超界 → 回默认正文 */
export function parseAboutBody(value: string | undefined): string {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 && trimmed.length <= ABOUT_BODY_MAX ? trimmed : ABOUT_BODY_DEFAULT;
}

/** 正文按换行切段（供前台渲染为多个 <p>；纯文本无 HTML，规避注入） */
export function splitAboutParagraphs(body: string): string[] {
  const parts = body.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [body];
}
