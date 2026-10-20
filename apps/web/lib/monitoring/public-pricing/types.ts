/**
 * TASK-070 · 公开定价页采集框架（U-M1：不使用 API Key，采集公开定价页/文档页）。
 *
 * 与 catalog/（TASK-060，JSON 目录源）平行：
 * - 每源一个 collector = 纯函数 parse(页面正文 → 观测[])；正文抓取由调用方注入（TextFetcher），
 *   本模块不发起任何网络请求（单测只吃 fixture，卡内不联网）。
 * - 无 API Key、无凭证分支：源 authRequired=false，采集路径上没有密钥读取。
 * - 价格保留原币 + 原单位（cny_per_1m_tokens），不做汇率换算、不改单位（归一属 TASK-047/048）。
 * - 解析出 0 条或页面结构变化 → { ok:false, reason }，不得用空列表冒充成功。
 * - 分时段/分上下文档给出多价时，按列取最大值（高峰/标准档上限价，见各 collector 注释）。
 */
import type { ProviderModelObservation } from "@aidean/shared";
import { positiveIntOrNull } from "../catalog/types";

/** 注入式抓取：返回页面正文（HTML/Markdown）；由调度层（TASK-062）提供，单测注入 fixture */
export type TextFetcher = (url: string) => Promise<string>;

export interface PublicPricingParseContext {
  /** 本次抓取时刻（观测 firstSeenAt/lastSeenAt 填此值） */
  fetchedAt: Date;
}

export type PublicPricingParseResult =
  | { ok: true; observations: ProviderModelObservation[] }
  | { ok: false; reason: string };

export interface PublicPricingCollector {
  /** 源 key（= monitoring_sources.key） */
  readonly key: string;
  /** 默认端点（运行时以 DB 行 endpoint 为准） */
  readonly defaultEndpoint: string;
  /** 公开定价页均为 CNY / 每百万 Token；不做换算 */
  readonly priceUnit: "cny_per_1m_tokens";
  /** 纯函数：页面正文 → 观测；解析 0 条/结构变化返回 ok:false */
  parse(text: string, ctx: PublicPricingParseContext): PublicPricingParseResult;
}

export type PublicPricingCollectResult =
  | { ok: true; endpoint: string; observations: ProviderModelObservation[] }
  | { ok: false; endpoint: string; reason: string };

/** 采集一次：注入 fetch 取正文 → parse；fetch 抛错收敛为 ok:false（由调度层记 last_error，其他源继续） */
export async function collectPublicPricing(
  collector: PublicPricingCollector,
  endpoint: string = collector.defaultEndpoint,
  opts: { fetchText: TextFetcher; now?: Date },
): Promise<PublicPricingCollectResult> {
  let text: string;
  try {
    text = await opts.fetchText(endpoint);
  } catch (e) {
    return { ok: false, endpoint, reason: `fetch_failed: ${e instanceof Error ? e.message : String(e)}` };
  }
  const parsed = collector.parse(text, { fetchedAt: opts.now ?? new Date() });
  return parsed.ok
    ? { ok: true, endpoint, observations: parsed.observations }
    : { ok: false, endpoint, reason: parsed.reason };
}

// ---------------------------------------------------------------- 登录/反爬检测（该源停止并回报）

const BLOCKED_MARKERS = ["请先登录", "登录后查看", "人机验证", "验证码", "captcha"];

/** 命中登录/反爬标记 → 返回停止原因；未命中 → null（其余源不受影响） */
export function blockedPageReason(text: string): string | null {
  const visible = htmlToText(text).toLowerCase();
  const hit = BLOCKED_MARKERS.find((m) => visible.includes(m.toLowerCase()));
  return hit ? `blocked_or_login_required: 页面命中「${hit}」标记` : null;
}

// ---------------------------------------------------------------- HTML 解析工具（零依赖）

/** HTML → 可见文本（去 script/style/标签，解码常用实体，压缩空白） */
export function htmlToText(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&yen;/gi, "¥")
    .replace(/&#165;/g, "¥")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** 截取子串：[startMarker, 任一 endMarker 首次出现)，找不到起点 → null */
export function sliceSection(text: string, startMarker: string, endMarkers: readonly string[]): string | null {
  const start = text.indexOf(startMarker);
  if (start < 0) return null;
  let end = text.length;
  for (const m of endMarkers) {
    const i = text.indexOf(m, start + startMarker.length);
    if (i >= 0 && i < end) end = i;
  }
  return text.slice(start, end);
}

/** 所有 <table>…</table> 片段 */
export function allTables(html: string): string[] {
  return Array.from(html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi), (m) => m[0]);
}

/** 所有 <tr>…</tr> 片段 */
export function tableRows(html: string): string[] {
  return Array.from(html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi), (m) => m[1]);
}

/** 表行内单元格（td/th）的可见文本 */
export function rowCells(rowHtml: string): string[] {
  return Array.from(rowHtml.matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi), (m) => htmlToText(m[1]));
}

/** 十进制字符串规范化：去前导 0、去尾随 0（"2.00"→"2"，"0.30"→"0.3"）；不做数值舍入 */
export function normalizeDecimalString(raw: string): string {
  const [intPart, frac = ""] = raw.split(".");
  const ip = intPart.replace(/^0+(?=\d)/, "") || "0";
  const fp = frac.replace(/0+$/, "");
  return fp ? `${ip}.${fp}` : ip;
}

/** 提取 CNY 金额：`¥ 2.00` / `￥2` / `0.04元` → 规范化十进制字符串（按出现顺序） */
export function yuanAmounts(text: string): string[] {
  const out: string[] = [];
  const re = /[¥￥]\s*([0-9]+(?:\.[0-9]+)?)|([0-9]+(?:\.[0-9]+)?)\s*元/g;
  for (const m of text.matchAll(re)) out.push(normalizeDecimalString(m[1] ?? m[2]));
  return out;
}

/** 多个候选取最大值（分时段/分档多价的保守上限）；空 → null，不写 0 */
export function maxDecimal(values: readonly string[]): string | null {
  let best: string | null = null;
  let bestN = -Infinity;
  for (const v of values) {
    const n = Number(v);
    if (Number.isFinite(n) && n > bestN) {
      bestN = n;
      best = v;
    }
  }
  return best;
}

/** 上下文长度文本 → token 数（1M/128K/131072/128,000；K/M/B 按 1024 进制，上下文窗口惯例）；无 → null */
export function parseTokenCount(text: string): number | null {
  const m = text.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(K|M|B)?/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  const unit = (m[2] ?? "").toUpperCase();
  const scale = unit === "K" ? 1024 : unit === "M" ? 1024 * 1024 : unit === "B" ? 1024 ** 3 : 1;
  return positiveIntOrNull(Math.floor(n * scale));
}

/** 去掉表头脚注标记（"deepseek-flash(1)" → "deepseek-flash"） */
export function stripFootnote(s: string): string {
  return s.replace(/\(\d+\)\s*$/, "").trim();
}
